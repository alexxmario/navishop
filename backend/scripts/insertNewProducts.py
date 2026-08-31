#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insereaza produsele noi (products-to-create.json + phase2-new-products.json) prin API
si construieste planul de imagini pentru ele (new-products-apply-plan.json).

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/insertNewProducts.py [--dry-run] [--limit N]
"""
import json, os, sys, time, argparse, urllib.request, urllib.error
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
STATE_FILE = os.path.join(HERE, 'insert-products-state.json')
LOG_FILE = os.path.join(HERE, 'insert-products-log.jsonl')


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG_FILE, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={str(v)[:70]}' for k, v in kw.items()), flush=True)


def http(url, data=None, headers=None, method=None, timeout=60, retries=4):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, method=method,
                                         headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read(), None
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', 'ignore')[:300]
            if e.code == 400:
                return None, f'400: {body}'
            last = f'{e.code}: {body}'
        except Exception as e:
            last = str(e)
        time.sleep(3 * (attempt + 1))
    return None, last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()

    batches = []
    for fname in ('products-to-create.json', 'phase2-new-products.json'):
        d = json.load(open(os.path.join(HERE, fname)))
        batches.extend(d['products'])
    # dedup pe slug (siguranta)
    seen, items = set(), []
    for v in batches:
        s = v['doc']['slug']
        if s not in seen:
            seen.add(s)
            items.append(v)
    print(f'Produse de inserat: {len(items)}')

    if args.dry_run:
        for v in items[:10]:
            print('  ', v['doc']['name'], '|', v['doc']['sku'], '|', v['doc']['price'])
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    raw, err = http(f'{API}/api/auth/login', json.dumps({'email': email, 'password': pw}).encode(),
                    {'Content-Type': 'application/json'})
    if err:
        sys.exit(f'login: {err}')
    token = json.loads(raw)['token']
    log('login-ok')

    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}
    n = 0
    for v in items:
        slug = v['doc']['slug']
        if state.get(slug, {}).get('status') == 'created':
            continue
        if args.limit and n >= args.limit:
            break
        n += 1
        raw, err = http(f'{API}/api/products', json.dumps(v['doc']).encode(),
                        {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
                        timeout=90)
        if err:
            if 'already exists' in err:
                state[slug] = {'status': 'created', 'note': 'exista deja'}
                log('exists', slug=slug)
            else:
                state[slug] = {'status': 'error', 'error': err}
                log('insert-error', slug=slug, error=err)
        else:
            pid = json.loads(raw).get('_id')
            state[slug] = {'status': 'created', 'id': pid,
                           'driveUrl': v['meta'].get('driveUrl'), 'name': v['doc']['name']}
            log('created', slug=slug)
        json.dump(state, open(STATE_FILE, 'w'), indent=1)
        time.sleep(0.2)

    created = [s for s, st in state.items() if st.get('status') == 'created']
    errors = {s: st for s, st in state.items() if st.get('status') == 'error'}
    print(f'\nCreate: {len(created)} | erori: {len(errors)}')

    # planul de imagini pentru produsele nou create
    by_url = defaultdict(lambda: {'products': []})
    meta_by_slug = {v['doc']['slug']: v for v in items}
    for slug in created:
        v = meta_by_slug.get(slug)
        if not v or not v['meta'].get('driveUrl'):
            continue
        u = v['meta']['driveUrl']
        by_url[u]['line'] = v['meta'].get('source', '')
        by_url[u]['products'].append({'slug': slug, 'name': v['doc']['name']})
    plan = [{'driveUrl': u, 'line': i.get('line', ''), 'products': i['products']}
            for u, i in by_url.items()]
    json.dump(plan, open(os.path.join(HERE, 'new-products-apply-plan.json'), 'w'),
              indent=1, ensure_ascii=False)
    print(f'Plan imagini produse noi: {len(plan)} foldere -> '
          f'{sum(len(p["products"]) for p in plan)} produse (new-products-apply-plan.json)')


if __name__ == '__main__':
    main()

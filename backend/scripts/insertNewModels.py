#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insereaza produsele din new-models-to-create.json prin API si scrie planul de imagini
pentru ele (new-models-apply-plan.json), gata de dat lui applyImagesFromLocal.py --plan.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/insertNewModels.py --dry-run
  python3 backend/scripts/insertNewModels.py --limit 1
  python3 backend/scripts/insertNewModels.py
"""
import json, os, sys, time, argparse, urllib.request, urllib.error
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
IN_FILE = os.path.join(HERE, 'new-models-to-create.json')
PLAN_OUT = os.path.join(HERE, 'new-models-apply-plan.json')
STATE_FILE = os.path.join(HERE, 'new-models-state.json')
LOG_FILE = os.path.join(HERE, 'new-models-log.jsonl')


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG_FILE, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={str(v)[:70]}' for k, v in kw.items()),
          flush=True)


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

    items = json.load(open(IN_FILE))['products']
    print(f'Produse de inserat: {len(items)}')
    if args.dry_run:
        for v in items:
            print(f"  {v['doc']['price']:>5} | {v['doc']['sku']:22} | {v['doc']['name']}")
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
            state[slug] = {'status': 'created', 'id': json.loads(raw).get('_id'),
                           'name': v['doc']['name'], 'folder': v['meta']['folder']}
            log('created', slug=slug)
        json.dump(state, open(STATE_FILE, 'w'), indent=1, ensure_ascii=False)
        time.sleep(0.2)

    created = [s for s, st in state.items() if st.get('status') == 'created']
    errors = {s: st for s, st in state.items() if st.get('status') == 'error'}
    print(f'\nCreate: {len(created)} | erori: {len(errors)}')
    for s, st in errors.items():
        print(f"  {s}: {st['error'][:120]}")

    by_folder = defaultdict(list)
    meta = {v['doc']['slug']: v for v in items}
    for slug in created:
        v = meta.get(slug)
        if v and v['meta'].get('folder'):
            by_folder[v['meta']['folder']].append({'slug': slug, 'name': v['doc']['name']})
    plan = [{'folder': f, 'products': ps} for f, ps in by_folder.items()]
    json.dump(plan, open(PLAN_OUT, 'w'), indent=1, ensure_ascii=False)
    print(f'Plan imagini: {len(plan)} seturi -> {sum(len(p["products"]) for p in plan)} produse '
          f'({os.path.basename(PLAN_OUT)})')


if __name__ == '__main__':
    main()

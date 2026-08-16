#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Copiaza setul de poze de la o familie de produse la alta, potrivind configuratiile
(2+32 / 4+64 / 6+128 / 2k). Foloseste URL-urile deja urcate pe server, deci merge si
cand folderul sursa nu mai e pe disc.

Perechile se dau intr-un JSON: [{"from": "<prefix familie sursa>",
                                 "to": "<prefix familie tinta>"}, ...]

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/copyImageSets.py --pairs copy-pairs.json --dry-run
  python3 backend/scripts/copyImageSets.py --pairs copy-pairs.json --run
"""
import json, os, re, sys, time, argparse, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'copy-image-sets-log.jsonl')
MIN_SOURCE_IMAGES = 15


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={v}' for k, v in kw.items()), flush=True)


def http(url, data=None, headers=None, method=None, timeout=90, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(url, data=data, method=method,
                                         headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            if a == retries - 1:
                raise
            time.sleep(3 * (a + 1))


def config_key(name):
    if re.search(r'\b2K\b', name):
        return '2k'
    m = re.search(r'(\d+)GB\s+(\d+)GB', name, re.I)
    if not m:
        return None
    ram, sto = int(m.group(1)), int(m.group(2))
    if sto == 32 or (ram == 2 and sto == 64):
        return '2+32'
    if ram == 4 and sto == 64:
        return '4+64'
    if sto == 128:
        return '6+128'
    return None


def fetch_all():
    products, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        products += d.get('products', [])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    return products


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pairs', required=True)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    pairs = json.load(open(args.pairs if os.path.isabs(args.pairs)
                           else os.path.join(HERE, args.pairs)))
    live = fetch_all()
    by_prefix = {}
    for p in live:
        by_prefix.setdefault(p['name'], p)

    def exact_family(prefix):
        """produsele familiei, fara variantele ei (BLACK/ROTUND/LOW/QLED...): dupa prefix
           trebuie sa urmeze direct diagonala sau 2K, nu un token de varianta"""
        out = []
        for p in live:
            if not p['name'].startswith(prefix):
                continue
            tail = p['name'][len(prefix):].strip()
            if re.match(r'(\d+(\.\d+)?\s*inch|2K|\d+GB)\b', tail, re.I):
                out.append(p)
        return out

    plan, notes = [], []
    for pair in pairs:
        src = exact_family(pair['from'])
        dst = exact_family(pair['to'])
        if not src:
            notes.append(f"sursa lipseste: {pair['from']}")
            continue
        if not dst:
            notes.append(f"tinta lipseste: {pair['to']}")
            continue
        src_by_cfg = {}
        for p in src:
            c = config_key(p['name'])
            if c and len(p.get('images') or []) >= MIN_SOURCE_IMAGES:
                # pastreaza sursa cu cele mai multe poze pentru configul respectiv
                if c not in src_by_cfg or len(p['images']) > len(src_by_cfg[c]['images']):
                    src_by_cfg[c] = p
        for p in dst:
            if len(p.get('images') or []) >= MIN_SOURCE_IMAGES:
                continue
            c = config_key(p['name'])
            s = src_by_cfg.get(c)
            if not s:
                notes.append(f"{p['name']}: fara sursa pentru configul {c}")
                continue
            plan.append({'slug': p['slug'], 'id': p['_id'], 'name': p['name'],
                         'was': len(p.get('images') or []),
                         'from': s['name'], 'n': len(s['images']),
                         'images': [{'url': im['url'], 'alt': p['name'], 'isPrimary': i == 0}
                                    for i, im in enumerate(s['images'])]})

    print(f'{len(plan)} produse de completat')
    for x in plan:
        print(f"  {x['was']:2}p -> {x['n']:2}p  {x['name'][:58]:58} <- {x['from'][:52]}")
    for n in notes:
        print('  ATENTIE:', n)
    if args.dry_run:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    log('login-ok')
    ok = 0
    for x in plan:
        http(f"{API}/api/products/{x['id']}", data=json.dumps({'images': x['images']}).encode(),
             method='PUT', headers={'Content-Type': 'application/json',
                                    'Authorization': f'Bearer {token}'})
        ok += 1
        log('copiat', slug=x['slug'], images=len(x['images']), was=x['was'])
    print(f'\nGata: {ok}/{len(plan)} produse completate.')


if __name__ == '__main__':
    main()

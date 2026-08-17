#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pune "Land Rover" in fata produselor numite doar "Range Rover ...", ca extractorul de
mărci sa le atribuie corect (vezi carBrands din services/brandModelExtractor.js).

Slug-urile NU se ating — URL-urile si indexarea rămân valabile. Se actualizeaza si
seoTitle/seoDescription, care conțin aceeași etichetă de model.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/renameRangeRover.py --dry-run
  python3 backend/scripts/renameRangeRover.py --run
"""
import json, os, re, sys, time, argparse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'rename-range-rover-log.jsonl')
PREFIX = 'Navigatie PilotOn Range Rover '


def http(url, data=None, headers=None, method=None, timeout=90, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(url, data=data, method=method,
                                         headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception:
            if a == retries - 1:
                raise
            time.sleep(3 * (a + 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    targets, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        for p in d.get('products', []):
            if p['name'].startswith(PREFIX):
                targets.append(p)
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1

    plan = []
    for p in targets:
        upd = {'name': p['name'].replace('Navigatie PilotOn Range Rover',
                                         'Navigatie PilotOn Land Rover Range Rover', 1)}
        for k in ('seoTitle', 'seoDescription'):
            v = p.get(k)
            if isinstance(v, str) and 'Range Rover' in v and 'Land Rover' not in v:
                upd[k] = v.replace('Range Rover', 'Land Rover Range Rover', 1)
        plan.append((p, upd))

    print(f'{len(plan)} produse de redenumit (slug-ul rămâne neschimbat)')
    for p, upd in plan:
        print(f"  {p['name']}\n    -> {upd['name']}")
        for k in ('seoTitle', 'seoDescription'):
            if k in upd:
                print(f"    {k}: {upd[k][:90]}")
    if args.dry_run:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    ok = 0
    for p, upd in plan:
        http(f"{API}/api/products/{p['_id']}", data=json.dumps(upd).encode(), method='PUT',
             headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
        ok += 1
        with open(LOG, 'a') as f:
            f.write(json.dumps({'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'slug': p['slug'],
                                'from': p['name'], 'to': upd['name']}, ensure_ascii=False) + '\n')
        print(f"  redenumit: {p['slug']}")
    print(f'\nGata: {ok}/{len(plan)}')


if __name__ == '__main__':
    main()

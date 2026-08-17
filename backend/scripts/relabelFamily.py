#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Schimba eticheta (model + ani) a unei familii de produse, ca sa ajunga pe aceeasi
pagina de model ca alta familie. Slug-urile NU se ating — URL-urile rămân valide.

REFUZA sa redenumeasca un produs daca numele rezultat exista deja: altfel ai doua
produse cu nume identic pe aceeasi pagina (catalogul are deja ~39 de astfel de cazuri
si nu merita adaugate altele).

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/relabelFamily.py --from "VW Golf 5 2004-2008" \
                                           --to   "VW Golf 5 2003-2010" --dry-run
  python3 backend/scripts/relabelFamily.py --from ... --to ... --run
"""
import json, os, sys, time, argparse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'relabel-family-log.jsonl')
PRE = 'Navigatie PilotOn '


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


def fetch_all():
    out, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        out += d.get('products', [])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', required=True, help='eticheta actuala, fara "Navigatie PilotOn "')
    ap.add_argument('--to', dest='dst', required=True, help='eticheta noua')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    live = fetch_all()
    names = {p['name'] for p in live}
    targets = [p for p in live if p['name'].startswith(PRE + args.src + ' ')]
    if not targets:
        sys.exit(f'niciun produs cu eticheta "{args.src}"')

    plan, clashes = [], []
    for p in targets:
        tail = p['name'][len(PRE + args.src):].lstrip()
        new_name = f'{PRE}{args.dst} {tail}'
        if new_name in names:
            clashes.append((p, new_name))
            continue
        upd = {'name': new_name}
        for k in ('seoTitle', 'seoDescription'):
            v = p.get(k)
            if isinstance(v, str) and args.src in v:
                upd[k] = v.replace(args.src, args.dst)
        plan.append((p, upd))

    print(f'{len(targets)} produse cu eticheta "{args.src}"')
    print(f'  {len(plan)} de redenumit, {len(clashes)} SARITE (numele ar fi duplicat)')
    for p, upd in plan:
        print(f"   OK    {p['name'][len(PRE):]}\n         -> {upd['name'][len(PRE):]}")
    for p, n in clashes:
        print(f"   CLASH {p['name'][len(PRE):]}\n         ar deveni {n[len(PRE):]} — exista deja")
    if args.dry_run or not plan:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    for p, upd in plan:
        http(f"{API}/api/products/{p['_id']}", data=json.dumps(upd).encode(), method='PUT',
             headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
        with open(LOG, 'a') as f:
            f.write(json.dumps({'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'slug': p['slug'],
                                'from': p['name'], 'to': upd['name']}, ensure_ascii=False) + '\n')
        print(f"   redenumit: {p['slug']}")
    print(f'\nGata: {len(plan)} redenumite, {len(clashes)} sarite.')


if __name__ == '__main__':
    main()

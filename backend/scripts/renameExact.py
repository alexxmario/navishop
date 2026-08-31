#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Redenumeste produse punctual: un JSON {slug: "nume nou"}. Pentru cazurile pe care
renameYears.py nu le poate exprima — cand pe langa ani se schimba si altceva in nume
(ex. se adauga diagonala la produsele 2K, ca sa nu se ciocneasca doua rame).

Slug-ul si SKU-ul NU se ating (URL-uri indexate + istoric de comenzi), ca la renameYears.
Se actualizeaza numele, seoTitle, seoDescription si alt-textul pozelor care purtau
numele vechi. Se opreste inainte de orice scriere daca un nume nou e deja folosit.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/renameExact.py --map rename-x1-e84.json --dry-run
  python3 backend/scripts/renameExact.py --map rename-x1-e84.json --run
"""
import argparse, json, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'rename-exact-log.jsonl')


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
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404):
                raise RuntimeError(f'{e.code} {e.read().decode("utf-8", "ignore")[:200]}')
            if a == retries - 1:
                raise
        except Exception:
            if a == retries - 1:
                raise
        time.sleep(3 * (a + 1))


def fetch_names():
    out, page = {}, 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        for p in d.get('products', []):
            out[p['name']] = p['slug']
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--map', required=True, help='JSON {slug: "nume nou"}')
    ap.add_argument('--seo-replace', help='"vechi=nou" — seoTitle/seoDescription sunt in forma '
                                          'generata ("Navigație BMW X1 E84 2009-2012 2K 4+64GB 8C"), '
                                          'deci nu contin numele produsului si trebuie tintite separat')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    mapping = json.load(open(args.map if os.path.isabs(args.map)
                             else os.path.join(HERE, args.map)))
    taken = fetch_names()

    items, clashes = [], []
    for slug, new_name in mapping.items():
        d = json.loads(http(f'{API}/api/products/{slug}'))
        d = d.get('product', d)
        owner = taken.get(new_name)
        if owner and owner != slug:
            clashes.append((slug, new_name, owner))
        items.append((d, new_name))

    print(f'{len(items)} de redenumit:')
    for d, n in items:
        print(f'  {d["name"]}\n    -> {n}')
    if clashes:
        print('\nOPRIT — numele astea sunt deja folosite de alte produse:')
        for slug, n, owner in clashes:
            print(f'  {n!r} apartine lui {owner} (voiai sa redenumesti {slug})')
        sys.exit(1)
    if args.dry_run:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    log('login-ok')

    ok = 0
    for d, new_name in items:
        patch = {'name': new_name}
        so, sn = (args.seo_replace.split('=', 1) if args.seo_replace else (None, None))
        for f in ('seoTitle', 'seoDescription'):
            v = d.get(f)
            if isinstance(v, str) and v:
                v = v.replace(d['name'], new_name)
                patch[f] = v.replace(so, sn) if so else v
        if d.get('images'):
            patch['images'] = [{'url': im['url'],
                                'alt': new_name if im.get('alt') == d['name'] else im.get('alt'),
                                'isPrimary': bool(im.get('isPrimary'))} for im in d['images']]
        http(f'{API}/api/products/{d["_id"]}', data=json.dumps(patch).encode(),
             method='PUT', headers=hdr)
        ok += 1
        log('redenumit', slug=d['slug'], nume=new_name)
    print(f'\nGata: {ok}/{len(items)} redenumite.')


if __name__ == '__main__':
    main()

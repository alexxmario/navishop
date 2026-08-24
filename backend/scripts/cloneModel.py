#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cloneaza produsele unei familii sub alt nume de model — pentru cazurile in care un
singur anunt acoperea doua masini ("Suzuki SX4 Fiat Sedici") si trebuie despartit in
doua produse, cate unul pe marca.

Se copiaza tot documentul (poze, specificatii, pret, descriere), se schimba doar
numele/slug-ul/SKU-ul si textele SEO. Configuratiile care exista deja la tinta se
sar, deci scriptul e reluabil.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/cloneModel.py --from "Suzuki SX4 2006-2014" \
      --to "Fiat Sedici 2006-2014" --dry-run
"""
import argparse, json, os, re, sys, time, unicodedata, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'clone-model-log.jsonl')
PREFIX = 'Navigatie PilotOn '
DROP = {'_id', '__v', 'reviews', 'createdAt', 'updatedAt', 'viewCount', 'purchaseCount',
        'averageRating', 'totalReviews', 'slug', 'sku'}


def log(event, **kw):
    with open(LOG, 'a') as f:
        f.write(json.dumps({'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw},
                           ensure_ascii=False) + '\n')


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


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def fetch_all():
    out, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        out += d.get('products', [])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    return out


def unique(value, used):
    out, i = value, 2
    while out in used:
        out = f'{value}{i}'
        i += 1
    used.add(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', required=True, help='baza sursa, fara "Navigatie PilotOn "')
    ap.add_argument('--to', dest='dst', required=True, help='baza noua')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    live = fetch_all()
    names = {p['name'] for p in live}
    slugs = {p['slug'] for p in live}
    skus = {p.get('sku') for p in live if p.get('sku')}

    src_prefix = PREFIX + args.src + ' '
    todo, skipped = [], []
    for p in live:
        if not p['name'].startswith(src_prefix):
            continue
        new_name = PREFIX + args.dst + ' ' + p['name'][len(src_prefix):]
        (skipped if new_name in names else todo).append((p, new_name))

    print(f'{len(todo)} de creat, {len(skipped)} deja existente la tinta')
    for _, n in todo:
        print('   +', n)
    for _, n in skipped:
        print('   =', n)
    if args.dry_run or not todo:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}

    made = failed = 0
    for p, new_name in todo:
        try:
            d = json.loads(http(f"{API}/api/products/id/{p['_id']}"))
            d = d.get('product', d)
            doc = {k: v for k, v in d.items() if k not in DROP}
            doc['name'] = new_name
            doc['slug'] = unique(slugify(new_name), slugs)
            doc['sku'] = unique(slugify(args.dst).upper().replace('-', '')[:20], skus)
            doc['status'] = 'active'
            for f in ('seoTitle', 'seoDescription'):
                if isinstance(d.get(f), str) and args.src in d[f]:
                    doc[f] = d[f].replace(args.src, args.dst)
            doc['images'] = [{'url': im['url'], 'alt': new_name, 'isPrimary': i == 0}
                             for i, im in enumerate(d.get('images') or [])]
            http(f'{API}/api/products', data=json.dumps(doc).encode(), headers=hdr)
            made += 1
            log('creat', name=new_name, slug=doc['slug'], sku=doc['sku'])
        except Exception as e:
            failed += 1
            log('eroare', name=new_name, error=str(e)[:200])
            print('   !!', new_name, str(e)[:120])
    print(f'\nGata: {made} create, {failed} esuate.')


if __name__ == '__main__':
    main()

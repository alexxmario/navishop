#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dubleaza produsele unei configuratii in alta configuratie: acelasi produs, cu RAM/stocare
schimbate peste tot unde apar (nume, slug, SKU, specificatii, SEO, alt-textul pozelor).

Regulile sunt in RULES. Pretul vine din grila configuratiei tinta (decizia lui Alex):
configuratia decide pretul, nu produsul-sursa.

Daca produsul-tinta exista deja:
  - la tintele "4GB 64GB 8CORE" nu se intampla (numele e distinct prin 8CORE lipit)
  - altfel, daca are POZE VECHI (<15) i se inlocuiesc pozele in loc sa se creeze duplicat
  - daca are deja poze bune, se sare

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/duplicateConfig.py --rule R3 --dry-run
  python3 backend/scripts/duplicateConfig.py --rule R3 --run
"""
import json, os, re, sys, time, argparse, unicodedata, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'duplicate-config-log.jsonl')
OLD_PHOTOS = 15

# cheie -> (config sursa, config tinta, RAM nou, stocare noua, pret tinta sau None = al sursei)
RULES = {
    'R1': ('10 inch 6GB 128GB 8 CORE', '10 inch 4GB 64GB 8CORE',   '4GB',  '64GB',  None),
    'R2': ('9 inch 6GB 128GB 8 CORE',  '9 inch 4GB 64GB 8CORE',    '4GB',  '64GB',  None),
    'R3': ('2K 4GB 64GB 8 CORE',       '2K 12GB 256GB 8 CORE',     '12GB', '256GB', 3299),
    'R4': ('10 inch 4GB 64GB 8 CORE',  '10 inch 8GB 256GB 8 CORE', '8GB',  '256GB', 2849),
    'R5': ('9 inch 4GB 64GB 8 CORE',   '9 inch 8GB 256GB 8 CORE',  '8GB',  '256GB', 2849),
}
DROP = {'_id', '__v', 'reviews', 'createdAt', 'updatedAt', 'viewCount', 'purchaseCount',
        'averageRating', 'totalReviews'}


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def http(url, data=None, headers=None, method=None, timeout=90, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(url, data=data, method=method,
                                         headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 400:
                raise RuntimeError(f'400 {e.read().decode("utf-8","ignore")[:200]}')
            if a == retries - 1:
                raise
        except Exception:
            if a == retries - 1:
                raise
        time.sleep(3 * (a + 1))


CACHE = os.path.join(HERE, 'duplicate-config-products.json')


def fetch_all(use_cache=False):
    if use_cache and os.path.exists(CACHE):
        return json.load(open(CACHE))
    out, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        out += d.get('products', [])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    json.dump(out, open(CACHE, 'w'), ensure_ascii=False)
    return out


def ram_num(s):
    m = re.match(r'(\d+)', s)
    return m.group(1) if m else s


def build(doc, src_cfg, dst_cfg, ram, sto, price, skus):
    """clona documentului, cu RAM/stocare schimbate peste tot"""
    old_name = doc['name']
    new_name = old_name[:-len(src_cfg)] + dst_cfg
    new = {k: v for k, v in doc.items() if k not in DROP}
    new['name'] = new_name
    new['slug'] = slugify(new_name)

    src_ram, src_sto = re.search(r'(\d+GB) (\d+GB)', src_cfg).groups()
    # SKU: marcajul de RAM e chiar inaintea sufixului de tip (2KPO / OPO / QPO), iar
    # inaintea lui stau cifrele anilor — deci nu se poate folosi \b la stanga.
    old_sku = doc.get('sku') or ''
    sku = re.sub(rf'{ram_num(src_ram)}GB(?=(?:2K|O|Q)?PO$)', f'{ram_num(ram)}GB', old_sku, count=1)
    if not sku or sku == old_sku:
        sku = (old_sku or 'PILOT') + ram_num(ram)
    base = sku
    i = 2
    while sku in skus:
        sku = f'{base}{i}'
        i += 1
    skus.add(sku)
    new['sku'] = sku
    new['price'] = price if price is not None else doc.get('price')
    new['status'] = 'active'

    ds = dict(new.get('detailedSpecs') or {})
    if ds:
        ds['ram'], ds['storage'] = ram, sto
        new['detailedSpecs'] = ds
    ro = json.loads(json.dumps(new.get('romanianSpecs') or {}))
    if isinstance(ro.get('hardware'), dict):
        ro['hardware']['memorieRAM'] = f'{ram_num(ram)} GB'
        ro['hardware']['capacitateStocare'] = f'{ram_num(sto)} GB'
    if isinstance(ro.get('general'), dict):
        ro['general']['sku'] = sku
    if isinstance(ro.get('rawDetails'), dict) and ro['rawDetails'].get('SKU'):
        ro['rawDetails']['SKU'] = sku
    ro.pop('scrapedAt', None)
    new['romanianSpecs'] = ro

    # SEO: "2K 4+64GB 8C" si "4 GB RAM, 64 GB stocare"
    if isinstance(new.get('seoTitle'), str):
        new['seoTitle'] = new['seoTitle'].replace(
            f'{ram_num(src_ram)}+{ram_num(src_sto)}GB', f'{ram_num(ram)}+{ram_num(sto)}GB')
    if isinstance(new.get('seoDescription'), str):
        new['seoDescription'] = new['seoDescription'].replace(
            f'{ram_num(src_ram)} GB RAM, {ram_num(src_sto)} GB stocare',
            f'{ram_num(ram)} GB RAM, {ram_num(sto)} GB stocare')
    new['images'] = [{'url': im['url'], 'alt': new_name, 'isPrimary': i == 0}
                     for i, im in enumerate(doc.get('images') or [])]
    sd = new.get('structuredDescription')
    if isinstance(sd, dict):
        sd.pop('parsedAt', None)
        for sec in sd.get('sections') or []:
            sec.pop('_id', None)
    return new


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rule', required=True, choices=sorted(RULES))
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--cached', action='store_true', help='refoloseste lista locala de produse')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')
    src_cfg, dst_cfg, ram, sto, price = RULES[args.rule]

    live = fetch_all(args.cached)
    # potrivirea se face pe slug: exista produse identice scrise "8 Core" vs "8 CORE",
    # nume diferite dar acelasi slug
    by_slug = {p['slug']: p for p in live}
    skus = {p.get('sku') for p in live if p.get('sku')}
    slugs = {p['slug'] for p in live}
    sources = [p for p in live if p['name'].endswith(' ' + src_cfg)]

    to_create, to_rephoto, skipped = [], [], []
    for p in sources:
        new_name = p['name'][:-len(src_cfg)] + dst_cfg
        ex = by_slug.get(slugify(new_name))
        if ex:
            if len(ex.get('images') or []) < OLD_PHOTOS:
                to_rephoto.append((p, ex))
            else:
                skipped.append((p, ex))
            continue
        to_create.append(p)

    print(f'{args.rule}: "{src_cfg}" -> "{dst_cfg}"  pret={price or "al sursei"}')
    print(f'  {len(sources)} surse | {len(to_create)} de creat | '
          f'{len(to_rephoto)} tinte existente cu poze vechi (doar poze) | {len(skipped)} sarite')
    if to_create:
        s = to_create[0]
        d = build(s, src_cfg, dst_cfg, ram, sto, price, set(skus))
        print(f'\n  exemplu:\n    {s["name"]}  [{s["price"]} lei]\n    -> {d["name"]}  [{d["price"]} lei]')
        print(f'    sku {s.get("sku")} -> {d["sku"]}')
        print(f'    RAM {(d.get("romanianSpecs") or {}).get("hardware",{}).get("memorieRAM")}'
              f' / {(d.get("romanianSpecs") or {}).get("hardware",{}).get("capacitateStocare")}'
              f' | poze {len(d["images"])}')
        print(f'    seo  {d.get("seoTitle")}')
    if args.dry_run:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    made = fixed = failed = 0
    for p in (to_create[:args.limit] if args.limit else to_create):
        doc = build(p, src_cfg, dst_cfg, ram, sto, price, skus)
        if doc['slug'] in slugs:
            log('slug-ocupat', slug=doc['slug']); failed += 1; continue
        try:
            http(f'{API}/api/products', data=json.dumps(doc).encode(), headers=hdr)
            slugs.add(doc['slug']); made += 1
            log('creat', slug=doc['slug'], sku=doc['sku'], price=doc['price'])
        except Exception as e:
            failed += 1
            log('eroare', slug=doc['slug'], error=str(e)[:200])
        if made % 50 == 0 and made:
            print(f'    ... {made} create')
    for p, ex in (to_rephoto[:args.limit] if args.limit else to_rephoto):
        imgs = [{'url': im['url'], 'alt': ex['name'], 'isPrimary': i == 0}
                for i, im in enumerate(p.get('images') or [])]
        try:
            http(f"{API}/api/products/{ex['_id']}", data=json.dumps({'images': imgs}).encode(),
                 method='PUT', headers=hdr)
            fixed += 1
            log('poze-inlocuite', slug=ex['slug'], images=len(imgs))
        except Exception as e:
            failed += 1
            log('eroare-poze', slug=ex['slug'], error=str(e)[:200])
    print(f'\nGata {args.rule}: {made} create, {fixed} cu poze inlocuite, {failed} esuate.')


if __name__ == '__main__':
    main()

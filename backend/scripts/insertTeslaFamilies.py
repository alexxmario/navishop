#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Creeaza familii noi de navigatii 9.7" "Tip Tesla", clonand cele 4 configuratii ale unei
familii-sablon de pe site. Fata de cloneModel.py, care copiaza documentul ca atare, aici
se rescriu si campurile legate de masina (categorii, Product Type, compatibility, SKU),
fiindca modelul-tinta e altul, nu doar alt nume.

Pozele se lasa goale: se urca imediat dupa, cu applyImagesFromLocal.py, ca sa nu ramana
pe produs pozele masinii-sablon.

Intrarea (tesla-new-families.json) e o lista de:
  {"base": "Tip Tesla Toyota Camry 2012-2016", "template": "Tip Tesla Opel Astra J 2009-2015"}

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/insertTeslaFamilies.py --dry-run
  python3 backend/scripts/insertTeslaFamilies.py --run
"""
import argparse, json, os, re, sys, time, unicodedata, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
FAMILIES_FILE = os.environ.get('TESLA_FAMILIES', os.path.join(HERE, 'tesla-new-families.json'))
STATE_FILE = os.environ.get('TESLA_STATE', os.path.join(HERE, 'tesla-families-state.json'))
LOG = os.path.join(HERE, 'tesla-families-log.jsonl')
PREFIX = 'Navigatie PilotOn '
CFG_RE = re.compile(r'\s(9[.,]7 inch .*)$')
DROP = {'_id', '__v', 'reviews', 'createdAt', 'updatedAt', 'viewCount', 'purchaseCount',
        'averageRating', 'totalReviews', 'slug', 'sku'}

# marcile trebuie sortate descrescator dupa lungime la potrivire, ca "Land Rover" sa nu
# fie inghitit de "Rover"
BRANDS = ['Alfa Romeo', 'Land Rover', 'Mercedes Benz', 'Audi', 'BMW', 'Volkswagen', 'VW',
          'Toyota', 'Ford', 'Opel', 'Dacia', 'Renault', 'Peugeot', 'Citroen', 'Honda',
          'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Subaru', 'Volvo', 'Skoda',
          'Seat', 'Fiat', 'Lancia', 'Jeep', 'Chevrolet', 'Jaguar', 'Porsche', 'Mini',
          'Smart', 'Suzuki', 'Isuzu', 'Iveco', 'Infiniti', 'Lexus', 'Acura', 'Genesis',
          'Cadillac', 'DS', 'Cupra', 'Dodge', 'Chrysler', 'SsangYong', 'Rover']


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
            body = e.read().decode('utf-8', 'ignore')[:300]
            if e.code in (400, 401, 403, 404):
                raise RuntimeError(f'{e.code} {body}')
            if a == retries - 1:
                raise RuntimeError(f'{e.code} {body}')
        except Exception:
            if a == retries - 1:
                raise
        time.sleep(3 * (a + 1))


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def split_base(base):
    """'Tip Tesla Toyota Land Cruiser 200 2007-2015' -> (marca, model, an0, an1)"""
    rest = re.sub(r'^Tip Tesla\s+', '', base)
    brand = next((b for b in sorted(BRANDS, key=len, reverse=True)
                  if re.match(rf'{re.escape(b)}\s+', rest, re.I)), None)
    if not brand:
        raise RuntimeError(f'nu recunosc marca in "{base}"')
    rest = rest[len(brand):].strip()
    m = re.search(r'\b(\d{4})-(\d{4})\b', rest)
    if not m:
        raise RuntimeError(f'nu gasesc anii in "{base}"')
    model = (rest[:m.start()] + ' ' + rest[m.end():]).strip()
    model = re.sub(r'\s+', ' ', model)
    return brand, model, int(m.group(1)), int(m.group(2))


def unique(value, used):
    out, i = value, 2
    while out in used:
        out = f'{value}{i}'
        i += 1
    used.add(out)
    return out


def fetch_all():
    out, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        out += d.get('products', [])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    return out


def sku_stem(base):
    """TIPTESLA + model compact (max 14) + anii scurti; fara marcajul de configuratie"""
    _, model, y0, y1 = split_base(base)
    return ('TIPTESLA' + re.sub(r'[^A-Z0-9]', '', model.upper())[:14]
            + f'{y0 % 100:02d}{y1 % 100:02d}')


def cfg_suffixes(tpl_products):
    """Marcajul de configuratie din SKU-urile sablonului (4, 2Q, 6, 2O), luat ca ce ramane
    dupa prefixul comun celor 4 — anii din SKU nu coincid mereu cu cei din nume."""
    skus = [p['sku'] for p in tpl_products]
    n = len(os.path.commonprefix(skus))
    return {p['name']: p['sku'][n:] for p in tpl_products}


def build_doc(tpl, tpl_meta, base, cfg, suffix, slugs, skus):
    brand, model, y0, y1 = split_base(base)
    tb, tm, ty0, ty1 = tpl_meta
    name = f'{PREFIX}{base} {cfg}'
    doc = {k: v for k, v in tpl.items() if k not in DROP}
    doc['name'] = name
    doc['slug'] = unique(slugify(name), slugs)
    doc['sku'] = unique(sku_stem(base) + suffix, skus)

    # marcajul de culoare distinge ramele intre ele in nume, dar nu intra in categorie
    model_cat = re.sub(r'\s+(BLACK|SILVER|GREY|GRI)$', '', model)
    tip_nou = f'{model_cat} ({y0} - {y1})'
    # GTIN-ul e unic pe produs; nu se copiaza de la sablon, ca sa nu iasa coduri duplicate
    doc['specifications'] = [
        {'key': s['key'], 'value': doc['sku'] if s['key'] == 'MPN' else
         tip_nou if s['key'] == 'Product Type' else s['value']}
        for s in (tpl.get('specifications') or []) if s['key'] != 'GTIN']
    doc['compatibility'] = [{**c, 'brand': brand, 'yearFrom': y0, 'yearTo': y1}
                            for c in (tpl.get('compatibility') or [])]

    rs = json.loads(json.dumps(tpl.get('romanianSpecs') or {}))
    gen = rs.setdefault('general', {})
    gen['sku'] = doc['sku']
    gen['categorii'] = (f'{tip_nou}, {brand}' if (gen.get('categorii') or '').strip().endswith(tb)
                        else tip_nou)
    doc['romanianSpecs'] = rs

    # anii de pe site raman ai familiei; textele SEO se rescriu pe modelul nou
    src_label, dst_label = f'{tb} {tm} {ty0}-{ty1}', f'{brand} {model} {y0}-{y1}'
    for f in ('seoTitle', 'seoDescription'):
        if isinstance(tpl.get(f), str):
            doc[f] = tpl[f].replace(src_label, dst_label)

    doc['images'] = []          # se umplu cu applyImagesFromLocal.py
    doc['status'] = 'active'
    return doc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    ap.add_argument('--families', default=FAMILIES_FILE)
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    families = json.load(open(args.families))
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}

    live = fetch_all()
    names = {p['name'] for p in live}
    slugs = {p['slug'] for p in live}
    skus = {p.get('sku') for p in live if p.get('sku')}

    tpl_cache = {}
    todo = []
    for fam in families:
        tpl_base = fam['template']
        if tpl_base not in tpl_cache:
            src = [p for p in live if p['name'].startswith(f'{PREFIX}{tpl_base} ')]
            if not src:
                sys.exit(f'sablonul "{tpl_base}" nu exista pe site')
            tpl_cache[tpl_base] = (src, split_base(tpl_base), cfg_suffixes(src))
        src, tpl_meta, sufs = tpl_cache[tpl_base]
        for p in src:
            cfg = CFG_RE.search(p['name']).group(1)
            name = f'{PREFIX}{fam["base"]} {cfg}'
            if name in names or state.get(name) == 'done':
                continue
            todo.append((fam['base'], tpl_base, p['_id'], cfg, name, sufs[p['name']]))

    print(f'{len(families)} familii -> {len(todo)} produse de creat')
    if args.dry_run:
        for base, _, pid, cfg, name, _suf in todo[:12]:
            print('   +', name)
        if len(todo) > 12:
            print(f'   ... si inca {len(todo) - 12}')
        for fam in families:
            split_base(fam['base'])          # validare marca/ani pentru toate
        print('toate numele se descompun corect in marca/model/ani')
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}

    full = {}
    made = failed = 0
    for base, tpl_base, pid, cfg, name, suf in todo:
        try:
            if pid not in full:
                d = json.loads(http(f'{API}/api/products/id/{pid}'))
                full[pid] = d.get('product', d)
            doc = build_doc(full[pid], tpl_cache[tpl_base][1], base, cfg, suf, slugs, skus)
            http(f'{API}/api/products', data=json.dumps(doc).encode(), headers=hdr)
            state[name] = 'done'
            made += 1
            log('creat', name=name, slug=doc['slug'], sku=doc['sku'])
            print(f'  + {doc["slug"]}')
        except Exception as e:
            failed += 1
            log('eroare', name=name, error=str(e)[:250])
            print(f'  !! {name}: {str(e)[:150]}')
        json.dump(state, open(STATE_FILE, 'w'), ensure_ascii=False, indent=1)
    print(f'\nGata: {made} create, {failed} esuate. Stare in {STATE_FILE}')


if __name__ == '__main__':
    main()

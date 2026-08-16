#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Construieste documentele pentru familiile de produse noi (modele care nu exista pe site),
clonand o familie-sablon existenta si rescriind doar partile specifice modelului.

Iese cu:
  new-models-to-create.json   {"products": [{"doc": {...}, "meta": {"folder": ...}}]}

  python3 backend/scripts/buildNewModels.py --spec new-models-spec-2026-07-22.json

Specificatia e un JSON: {"src": "<folder cu pozele>", "families": [
  {"label": "Chevrolet Camaro 2010-2015",         # eticheta noua (fara "Navigatie PilotOn ")
   "template": "Navigatie PilotOn ...",           # familia-sablon de clonat
   "categorii": "Camaro (2010 - 2015)",
   "skuToken": "",                                # optional, pentru variante de rama
   "folders": {"2+32": "...", "4+64": "...", "6+128": "...", "2k": "..."}}]}
"""
import json, os, re, sys, unicodedata, urllib.request, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
DEFAULT_SPEC = os.path.join(HERE, 'new-models-spec-2026-07-17.json')

# campurile care nu se copiaza de pe sablon
DROP = {'_id', '__v', 'images', 'reviews', 'createdAt', 'updatedAt', 'viewCount',
        'purchaseCount', 'averageRating', 'totalReviews'}


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')


def config_key(name):
    """bucket-ul de poze pentru un nume de produs"""
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


_http_cache = {}


def http_json(url, cache=False):
    if cache and url in _http_cache:
        return _http_cache[url]
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read())
    if cache:
        _http_cache[url] = d
    return d


VARIANT_WORDS = {'rotund', 'patrat', 'black', 'silver', 'white', 'grey'}


def sku_for(label, config_tail, sku_token):
    """MASTER0311 + 4GB + O/Q/2K + PO, in stilul SKU-urilor existente"""
    words = [w for w in re.split(r'\s+', label) if w]
    # varianta apare deja ca sku_token, nu o repeta si in radacina
    words = [w for w in words if w.lower() not in VARIANT_WORDS]
    brandless = [w for w in words if w.lower() not in ('dacia', 'renault', 'vw', 'opel', 'nissan')]
    years = ''
    for w in brandless:
        m = re.match(r'(\d{4})-(\d{4})$', w)
        if m:
            years = m.group(1)[2:] + m.group(2)[2:]
    if not years:
        # etichete de tip "dupa 2018" -> "18"
        m = re.search(r'dupa\s+(\d{4})', label, re.I)
        if m:
            years = m.group(1)[2:]
    stem = ''.join(w for w in brandless
                   if not re.match(r'\d{4}-\d{4}$', w) and not re.match(r'\d{4}$', w)
                   and w.lower() != 'dupa').upper()
    stem = re.sub(r'[^A-Z0-9]', '', stem)[:12]
    m = re.search(r'(\d+)GB\s+(\d+)GB', config_tail, re.I)
    ram = f'{m.group(1)}GB' if m else ''
    if re.search(r'\b2K\b', config_tail):
        kind = '2K'
    elif re.search(r'8\s*Core', config_tail, re.I):
        kind = 'O'
    else:
        kind = 'Q'
    # doua familii cu acelasi model+ani dar ecrane diferite trebuie sa aiba SKU-uri diferite
    scr = '10' if re.search(r'\b10\s*inch\b', config_tail, re.I) else ''
    return f'{stem}{years}{scr}{sku_token}{ram}{kind}PO'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', default=DEFAULT_SPEC, help='fisierul de specificatii al familiilor')
    ap.add_argument('--out', default=os.path.join(HERE, 'new-models-to-create.json'))
    args = ap.parse_args()

    spec = json.load(open(args.spec if os.path.isabs(args.spec)
                          else os.path.join(HERE, args.spec)))
    global SRC, FAMILIES, OUT
    SRC = os.environ.get('PILOTON_SRC') or spec['src']
    FAMILIES = spec['families']
    OUT = args.out if os.path.isabs(args.out) else os.path.join(HERE, args.out)

    live = json.load(open(os.path.join(HERE, 'products-live-cache.json'))) \
        if os.path.exists(os.path.join(HERE, 'products-live-cache.json')) else None
    if live is None:
        products, page = [], 1
        while True:
            d = http_json(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc')
            products += [{'name': p['name'], 'slug': p['slug'], 'sku': p.get('sku')}
                         for p in d.get('products', [])]
            if not d.get('pagination', {}).get('hasNextPage'):
                break
            page += 1
        live = products
        json.dump(live, open(os.path.join(HERE, 'products-live-cache.json'), 'w'), ensure_ascii=False)
    existing_slugs = {p['slug'] for p in live}
    existing_skus = {p.get('sku') for p in live if p.get('sku')}

    out, warnings = [], []
    for fam in FAMILIES:
        tpl_pre = fam['template']
        siblings = [p for p in live if p['name'].startswith(tpl_pre)]
        if not siblings:
            sys.exit(f'sablon negasit: {tpl_pre}')
        for sib in sorted(siblings, key=lambda p: p['name']):
            doc = http_json(f"{API}/api/products/{sib['slug']}", cache=True)
            doc = json.loads(json.dumps(doc.get('product') or doc))   # copie per familie
            tail = doc['name'][len(tpl_pre):].strip()      # ex: '9 inch 4GB 64GB 4 CORE'
            cfg = config_key(doc['name'])
            folder = fam['folders'].get(cfg)
            if not folder:
                warnings.append(f"{fam['label']} / {tail}: fara folder pentru configul {cfg}")
            elif not os.path.isdir(os.path.join(SRC, folder, 'site')):
                sys.exit(f'folder inexistent: {folder}')

            new = {k: v for k, v in doc.items() if k not in DROP}
            new_name = f"Navigatie PilotOn {fam['label']} {tail}"
            # numele 2K nu contin diagonala, deci doua familii cu acelasi model+ani dar
            # ecrane diferite ar da acelasi slug. Site-ul rezolva asta cu "2K 9 Inch"
            # (vezi "Toyota Rav4 2013-2018 LOW 2K 10 Inch") — aceeasi conventie aici.
            if slugify(new_name) in existing_slugs and tail.upper().startswith('2K'):
                screen = fam.get('screen') or ('10' if '10 inch' in tpl_pre.lower()
                                               or any('10 inch' in s['name'].lower()
                                                      for s in siblings) else '9')
                tail = re.sub(r'^2K\b', f'2K {screen} Inch', tail, flags=re.I)
                new_name = f"Navigatie PilotOn {fam['label']} {tail}"
            new['name'] = new_name
            new['slug'] = slugify(new_name)
            sku = sku_for(fam['label'], tail, fam.get('skuToken', ''))
            if sku in existing_skus:
                # acelasi model+ani pe alta diagonala, sau familie deja existenta pe site
                base, suffix = sku[:-2], sku[-2:]          # ...PO
                for cand in [f"{base}{fam.get('screen', '')}{suffix}"] + \
                            [f'{base}{i}{suffix}' for i in range(2, 12)]:
                    if cand not in existing_skus:
                        sku = cand
                        break
            new['sku'] = sku
            new['status'] = 'active'
            new['newProduct'] = True

            # etichetele de model din texte
            old_label = tpl_pre[len('Navigatie PilotOn '):]
            for key in ('seoTitle', 'seoDescription', 'description'):
                if isinstance(new.get(key), str):
                    new[key] = new[key].replace(old_label, fam['label'])
            ro = new.get('romanianSpecs') or {}
            ro.pop('scrapedAt', None)
            if isinstance(ro.get('general'), dict):
                ro['general'] = {**ro['general'], 'sku': new['sku'], 'categorii': fam['categorii']}
            if isinstance(ro.get('rawDetails'), dict):
                rd = dict(ro['rawDetails'])
                if rd.get('Categorii'):
                    rd['Categorii'] = fam['label']
                if rd.get('SKU'):
                    rd['SKU'] = new['sku']
                ro['rawDetails'] = rd
            # limitarile sunt specifice modelului-sablon -> nu se mostenesc
            if isinstance(ro.get('additional'), dict) and ro['additional'].get('limitari'):
                ro = {**ro, 'additional': {k: v for k, v in ro['additional'].items()
                                           if k != 'limitari'}}
            new['romanianSpecs'] = ro
            sd = new.get('structuredDescription')
            if isinstance(sd, dict):
                sd.pop('parsedAt', None)
                if isinstance(sd.get('originalDescription'), str):
                    sd['originalDescription'] = sd['originalDescription'].replace(
                        old_label, fam['label'])
                for sec in sd.get('sections') or []:
                    sec.pop('_id', None)

            if new['slug'] in existing_slugs:
                warnings.append(f"slug deja existent, sar: {new['slug']}")
                continue
            if new['sku'] in existing_skus:
                warnings.append(f"SKU duplicat: {new['sku']} ({new_name})")
            existing_slugs.add(new['slug'])
            existing_skus.add(new['sku'])
            out.append({'doc': new, 'meta': {'folder': folder, 'family': fam['label'],
                                             'config': cfg}})

    json.dump({'products': out}, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print(f'{len(out)} produse noi -> {os.path.basename(OUT)}')
    fam_count = {}
    for v in out:
        fam_count[v['meta']['family']] = fam_count.get(v['meta']['family'], 0) + 1
    for k, v in fam_count.items():
        print(f'  {k:38} {v} produse')
    for w in warnings:
        print('  ATENTIE:', w)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Adapteaza familia canonica de 9 configuratii de la o masina la alta: se ia documentul
produsului-sursa (specificatii hardware, descriere, sectiuni, POZE), peste care se pune
identitatea masinii-tinta (marca, compatibilitate, categorii, SKU, SEO).

Identitatea nu se ghiceste: se copiaza de la un produs care exista deja la masina-tinta
(--identity <slug>), de obicei unul de 7 inch ramas din stocul vechi.

Se sar configuratiile care exista deja la tinta, deci scriptul e reluabil.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/adaptFamily.py --from "Mercedes Benz B CLASS W245 2005-2011" \
      --to "VW LT3 2006-2016" --identity navigatie-piloton-vw-lt3-2006-2016-7-inch-4gb-64gb-4core \
      --sku-prefix LT30616 --dry-run
"""
import argparse, json, os, re, sys, time, unicodedata, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'adapt-family-log.jsonl')
PREFIX = 'Navigatie PilotOn '
DROP = {'_id', '__v', 'reviews', 'createdAt', 'updatedAt', 'viewCount', 'purchaseCount',
        'averageRating', 'totalReviews'}
# setul canonic de 9, ca sufix de nume (vezi normalizeFamilies.py)
CANON = re.compile(r'^(?:(?:9|10)\s*inch|2K(?:\s+(?:9|10)\s*Inch)?)\s+'
                   r'\d+GB \d+GB (?:4 CORE|8 CORE|8CORE)$', re.I)
# --any-config: orice configuratie, dar sufixul trebuie sa INCEAPA cu un jeton de
# configuratie. Asta tine variantele in afara: cu sursa "... Seria 1 2012-2017 NBT",
# un produs "NBT EVO 10.25 Inch ..." are sufixul "EVO 10.25 ..." si e sarit corect.
ANY = re.compile(r'^(?:\d+(?:\.\d+)?\s*inch|2K|\d+GB)\b', re.I)


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={v}' for k, v in kw.items()), flush=True)


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
            if e.code in (400, 401, 403, 404):
                raise RuntimeError(f'{e.code} {e.read().decode("utf-8", "ignore")[:200]}')
            if a == retries - 1:
                raise
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


def full(pid):
    d = json.loads(http(f'{API}/api/products/id/{pid}'))
    return d.get('product', d)


def common_prefix(values):
    if not values:
        return ''
    out = values[0]
    for v in values[1:]:
        while not v.startswith(out):
            out = out[:-1]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', required=True, help='baza sursa, fara "Navigatie PilotOn "')
    ap.add_argument('--to', dest='dst', required=True, help='baza tinta, fara "Navigatie PilotOn "')
    ap.add_argument('--identity', required=True, help='slug-ul unui produs existent al masinii-tinta')
    ap.add_argument('--sku-prefix', required=True, help='ex. LT30616; se lipeste marcajul de config')
    ap.add_argument('--any-config', action='store_true',
                    help='ia orice configuratie, nu doar setul canonic de 9 (10.25/12.3/12.9 inch etc.)')
    ap.add_argument('--sku-from-config', action='store_true',
                    help='marcajul de SKU se construieste din configuratie (diagonala + RAM), '
                         'de folosit cand SKU-urile sursei sunt neregulate')
    ap.add_argument('--price-add', type=int, default=0,
                    help='se adauga la pretul sursei (ex. 300 pentru linia NBT EVO)')
    ap.add_argument('--seo-from', help='ce se inlocuieste in seoTitle/seoDescription; implicit '
                                       '--from. De dat explicit cand SEO-ul contine doar modelul, '
                                       'fara marcajul de interfata din --from')
    ap.add_argument('--seo-to', help='cu ce se inlocuieste; implicit --to')
    ap.add_argument('--only-tail', help='doar sursele cu aceste cozi de nume exacte (virgula). '
                                        'De folosit cand tinta are deja configuratia, dar scrisa '
                                        'altfel — altfel ar iesi o dublura.')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    live = fetch_all()
    names = {p['name'] for p in live}
    slugs = {p['slug'] for p in live}
    skus = {p.get('sku') for p in live if p.get('sku')}

    ident = json.loads(http(f'{API}/api/products/{args.identity}'))
    ident = ident.get('product', ident)

    src_prefix = PREFIX + args.src + ' '
    keep = ANY if args.any_config else CANON
    src = [p for p in live if p['name'].startswith(src_prefix)
           and keep.match(p['name'][len(src_prefix):])]
    if args.only_tail:
        want = {t.strip() for t in args.only_tail.split(',') if t.strip()}
        src = [p for p in src if p['name'][len(src_prefix):] in want]
    if not src:
        sys.exit(f'nicio configuratie canonica la sursa "{args.src}"')
    # marcajul de config din SKU = ce ramane dupa prefixul comun al familiei-sursa
    sku_base = common_prefix(sorted(p.get('sku') or '' for p in src))

    plan, planned_slugs = [], set()
    for p in sorted(src, key=lambda x: x['name']):
        tail = p['name'][len(src_prefix):]
        new_name = PREFIX + args.dst + ' ' + tail
        if new_name in names:
            continue
        slug = slugify(new_name)
        if slug in slugs or slug in planned_slugs:
            # doua produse-sursa cu acelasi nume in afara de majuscule ("Inch"/"inch")
            print(f'  ! sarit, slug deja revendicat: {p["name"]}')
            continue
        planned_slugs.add(slug)
        if args.sku_from_config:
            m = re.match(r'(\d+(?:\.\d+)?)\s*inch\b.*?(\d+GB)', tail, re.I)
            sku_tail = (m.group(1).replace('.', '') + m.group(2).upper()) if m \
                else slugify(tail).upper().replace('-', '')
        else:
            sku_tail = (p.get('sku') or '')[len(sku_base):] or slugify(tail).upper().replace('-', '')
        sku = args.sku_prefix + sku_tail
        i = 2
        while sku in skus:
            sku = f'{args.sku_prefix}{sku_tail}{i}'
            i += 1
        skus.add(sku)
        plan.append({'src': p, 'name': new_name, 'slug': slug, 'sku': sku, 'tail': tail,
                     'price': (p.get('price') or 0) + args.price_add})

    print(f'sursa: {len(src)} configuratii canonice | prefix SKU sursa: "{sku_base}"')
    print(f'identitate de la: {ident["name"]}')
    print(f'  brand={ident.get("brand")} | compatibility='
          f'{json.dumps(ident.get("compatibility"), ensure_ascii=False)}')
    print(f'  categorii={(ident.get("romanianSpecs") or {}).get("general", {}).get("categorii")}')
    print(f'\n{len(plan)} de creat:')
    for x in plan:
        print(f'  + {x["name"]}  [{x["price"]} lei, {x["src"].get("imageCount", 0)} poze]'
              f'\n      sku {x["src"].get("sku")} -> {x["sku"]}   slug {x["slug"]}')
    if args.dry_run or not plan:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    log('login-ok')

    made = failed = 0
    for x in plan:
        d = full(x['src']['_id'])
        doc = {k: v for k, v in d.items() if k not in DROP}
        doc['name'] = x['name']
        doc['slug'] = x['slug']
        doc['sku'] = x['sku']
        doc['price'] = x['price']
        doc['status'] = 'active'
        # identitatea masinii-tinta
        doc['brand'] = ident.get('brand')
        doc['compatibility'] = ident.get('compatibility')
        ro = doc.get('romanianSpecs') or {}
        if isinstance(ro.get('general'), dict):
            ro['general']['sku'] = x['sku']
            ident_gen = (ident.get('romanianSpecs') or {}).get('general') or {}
            if ident_gen.get('categorii'):
                ro['general']['categorii'] = ident_gen['categorii']
        if isinstance(ro.get('rawDetails'), dict):
            if ro['rawDetails'].get('SKU'):
                ro['rawDetails']['SKU'] = x['sku']
            # rawDetails.Categorii poarta numele masinii-sursa; se ia tot de la identitate
            ident_raw = ((ident.get('romanianSpecs') or {}).get('rawDetails') or {})
            if ro['rawDetails'].get('Categorii') and ident_raw.get('Categorii'):
                ro['rawDetails']['Categorii'] = ident_raw['Categorii']
        ro.pop('scrapedAt', None)
        doc['romanianSpecs'] = ro
        for f in ('seoTitle', 'seoDescription'):
            v = d.get(f)
            if isinstance(v, str) and v:
                doc[f] = (v.replace(d['name'], x['name']).replace(args.src, args.dst)
                          .replace(args.seo_from or args.src, args.seo_to or args.dst))
        doc['images'] = [{'url': im['url'], 'alt': x['name'], 'isPrimary': i == 0}
                         for i, im in enumerate(d.get('images') or [])]
        sd = doc.get('structuredDescription')
        if isinstance(sd, dict):
            sd.pop('parsedAt', None)
            for sec in sd.get('sections') or []:
                sec.pop('_id', None)
        # produsele soft-deleted tin slug-ul si SKU-ul ocupate fara sa se vada la citire,
        # deci coliziunea apare abia la POST (vezi duplicateConfig.py, aceeasi tratare)
        want, err, n = dict(doc), None, 1
        while n <= 5:
            try:
                http(f'{API}/api/products', data=json.dumps(doc).encode(), headers=hdr)
                made += 1
                log('creat' if doc['slug'] == want['slug'] and doc['sku'] == want['sku']
                    else 'creat-varianta', slug=doc['slug'], sku=doc['sku'],
                    price=doc.get('price'), images=len(doc['images']))
                err = None
                break
            except Exception as e:
                err = str(e)
                if 'slug already exists' in err and not doc['slug'].endswith('-po'):
                    doc['slug'] += '-po'
                elif 'sku already exists' in err:
                    n += 1
                    doc['sku'] = f"{want['sku']}{n}"
                    if isinstance((doc.get('romanianSpecs') or {}).get('general'), dict):
                        doc['romanianSpecs']['general']['sku'] = doc['sku']
                else:
                    break
        if err:
            failed += 1
            log('eroare', slug=doc['slug'], error=err[:200])
    print(f'\nGata: {made} create, {failed} esuate.')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aduce fiecare pagina de model la setul canonic de 9 configuratii pe rama, dupa modelul
https://navi.piloton.ro/brand/Volkswagen/polo%20dupa%202017 :

    9/10 inch  2GB 32GB 4 CORE | 4GB 64GB 4 CORE | 4GB 64GB 8 CORE
               6GB 128GB 8 CORE | 4GB 64GB 8CORE | 8GB 256GB 8 CORE
    2K         4GB 64GB 8 CORE | 8GB 256GB 8 CORE | 12GB 256GB 8 CORE

- ce e in plus (stocul vechi "8 Core 4G", "2K QLED", "2GB 64GB 4 Core", "8GB 128GB",
  "7 inch") se dezactiveaza;
- ce lipseste se creeaza clonand un produs canonic cu ACEEASI configuratie (descriere,
  sectiuni, specificatii hardware), peste care se pun identitatea masinii (compatibilitate,
  SKU, categorii) si POZELE din familia proprie.

Pozele se iau pe grupe, asa cum sunt partajate fizic (regula lui Alex):
    4 CORE : 2GB 32GB 4 CORE + 4GB 64GB 4 CORE
    8 CORE : 4GB 64GB 8 CORE + 6GB 128GB 8 CORE + 8GB 256GB 8 CORE + 4GB 64GB 8CORE
    2K     : toate cele trei 2K

  python3 backend/scripts/normalizeFamilies.py --plan
  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/normalizeFamilies.py --run [--only-create|--only-delete]
"""
import argparse, copy, json, os, re, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
MODELS = os.path.join(HERE, 'normalize-models.json')
PLAN = os.path.join(HERE, 'normalize-plan.json')
CACHE = os.path.join(HERE, 'normalize-cache.json')
LOG = os.path.join(HERE, 'normalize-log.jsonl')
PREFIX = 'Navigatie PilotOn '
# doar 9" si 10" sunt rame de sine statatoare; 7"/8" e stoc vechi, nu are set canonic
RAMA_DIAGS = {'9', '10'}

# familii cu doua rame in care nicio rama nu are inca un set 2K: carei rame ii revin
# produsele «2K ...» existente (dupa prefixul de SKU). Celelalte rame primesc 2K-uri
# scrise «2K 9 Inch ...», ca sa nu se ciocneasca slugurile.
FLOAT_2K = {'Navigatie PilotOn Peugeot 208 2013-2018': '10'}

# produse pe care le-a decis Alex, nu regula: perechea 2K in plus de la Giulietta
# (alt set de poze, dar fara frati non-2K — ramasita din curatenia de 10" din iulie)
FORCE_DELETE = {'ALFAROMEOG14204GB2KPO2': 'pereche 2K in plus (decizia lui Alex)',
                'ALFAROMEOG14208GB2KPO2': 'pereche 2K in plus (decizia lui Alex)'}

# configuratiile canonice, in ordinea de pe pagina Polo: (ram, stocare, nuclee, e2K)
CANON = [(2, 32, '4 CORE', False), (4, 64, '4 CORE', False), (4, 64, '8 CORE', False),
         (6, 128, '8 CORE', False), (4, 64, '8CORE', False), (8, 256, '8 CORE', False),
         (4, 64, '8 CORE', True), (8, 256, '8 CORE', True), (12, 256, '8 CORE', True)]

# pretul pe treapta de rama (mic / mediu / mare); None = pret fix, indiferent de rama
PRICES = {(2, 32, '4 CORE', False): (849, 899, 949),
          (4, 64, '4 CORE', False): (999, 1049, 1099),
          (4, 64, '8 CORE', False): (1399, 1449, 1499),
          (6, 128, '8 CORE', False): (1599, 1649, 1699),
          (4, 64, '8CORE', False): (1599, 1649, 1699),
          (8, 256, '8 CORE', False): (2849, 2849, 2849),
          (4, 64, '8 CORE', True): (1999, 2049, 2099),
          (8, 256, '8 CORE', True): (2799, 2849, 2899),
          (12, 256, '8 CORE', True): (3299, 3299, 3299)}

# grupele de poze partajate
def img_group(cfg):
    ram, sto, cores, is2k = cfg
    return '2K' if is2k else ('4C' if cores == '4 CORE' else '8C')


# campurile de continut care vin de la produsul-donator (identice pe tot catalogul)
CONTENT = ['description', 'structuredDescription', 'detailedSpecs', 'displaySpecs',
           'technicalFeatures', 'features', 'inTheBox', 'connectivityOptions', 'warranty']
DROP = {'_id', '__v', 'reviews', 'createdAt', 'updatedAt', 'viewCount', 'purchaseCount',
        'averageRating', 'totalReviews', 'imageCount'}


def log(event, **kw):
    with open(LOG, 'a') as f:
        f.write(json.dumps({'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw},
                           ensure_ascii=False) + '\n')


def http(url, data=None, headers=None, method=None, timeout=120, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(url, data=data, method=method,
                                         headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', 'ignore')[:200]
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


# ---------------------------------------------------------------- parsarea numelui
TAIL = re.compile(r'\s(\d+)GB\s+(\d+)GB\s+(.+)$', re.I)
SCREEN = re.compile(r'\s(2K|QLED|\d+(?:\.\d+)?\s*inch)\s*$', re.I)


def parse(name):
    """-> (prefix familie, tokeni ecran, ram, stocare, nuclee, extra) sau None"""
    m = TAIL.search(name)
    if not m:
        return None
    ram, sto, rest = int(m.group(1)), int(m.group(2)), m.group(3).strip()
    head = name[:m.start()]
    tokens = []
    while True:
        s = SCREEN.search(head)
        if not s:
            break
        tokens.insert(0, re.sub(r'\s+', ' ', s.group(1)).strip())
        head = head[:s.start()]
    c = re.match(r'(\d)\s*CORE\b', rest, re.I)
    if not c:
        return None
    cores = ('8CORE' if re.match(r'8CORE\b', rest, re.I) else f'{c.group(1)} CORE')
    extra = rest[c.end():].strip()
    return head.strip(), tokens, ram, sto, cores, extra


def cfg_of(p):
    """configuratia produsului + rama careia ii apartine ('9', '10', None = 2K nedecis)"""
    r = parse(p['name'])
    if not r:
        return None
    prefix, tokens, ram, sto, cores, extra = r
    up = [t.upper() for t in tokens]
    is2k = '2K' in up
    qled = 'QLED' in up
    diags = [t.lower().replace(' inch', '').strip() for t in tokens if 'inch' in t.lower()]
    cfg = (ram, sto, cores, is2k)
    canonical = (not qled and not extra and cfg in PRICES and len(diags) <= 1
                 and (is2k or len(diags) == 1)
                 and (not diags or diags[-1] in RAMA_DIAGS))
    return {'prefix': prefix, 'cfg': cfg, 'diag': diags[-1] if diags else None,
            'n_diags': len(diags), 'is2k': is2k, 'qled': qled, 'extra': extra,
            'canonical': canonical,
            'label': cfg_label(cfg, diags[-1] if diags else None)}


def cfg_label(cfg, diag):
    ram, sto, cores, is2k = cfg
    head = '2K' if is2k else f'{diag} inch'
    return f'{head} {ram}GB {sto}GB {cores}'


def cfg_name(prefix, cfg, diag, tag_2k_diag):
    """numele produsului; tag_2k_diag = familia isi scrie 2K-urile ca «2K 9 Inch ...»"""
    ram, sto, cores, is2k = cfg
    if is2k:
        head = f'2K {diag} Inch' if tag_2k_diag else '2K'
    else:
        head = f'{diag} inch'
    return f'{prefix} {head} {ram}GB {sto}GB {cores}'


# ---------------------------------------------------------------- date
def fetch_model(url):
    path = urllib.parse.urlparse(url).path
    _, _, brand, model = path.split('/', 3)
    brand, model = urllib.parse.unquote(brand), urllib.parse.unquote(model)
    d = json.loads(http(f'{API}/api/brands/{urllib.parse.quote(brand)}/'
                        f'{urllib.parse.quote(model)}'))['data']
    return {'url': url, 'brand': brand, 'model': model, 'products': d.get('products', [])}


def fetch_all():
    out, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}'
                            f'&sortBy=_id&sortOrder=asc'))
        out += d.get('products', [])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    return out


def load(force=False):
    if not force and os.path.exists(CACHE):
        return json.load(open(CACHE))
    data = {'models': [fetch_model(u) for u in json.load(open(MODELS))], 'all': fetch_all()}
    json.dump(data, open(CACHE, 'w'), ensure_ascii=False)
    return data


DOCS = {}


def full(pid):
    if pid not in DOCS:
        d = json.loads(http(f'{API}/api/products/id/{pid}'))
        DOCS[pid] = d.get('product', d)
    return DOCS[pid]


# ---------------------------------------------------------------- planul
def tier_of(rama):
    """treapta de pret: 0 mic / 1 mediu / 2 mare, dedusa din preturile existente"""
    votes = []
    for p in rama['products']:
        c = p['_cfg']
        prices = PRICES.get(c['cfg'])
        if prices and prices[0] != prices[2]:
            if c['canonical'] and p['price'] in prices:
                votes.append(prices.index(p['price']))
            elif not c['canonical'] and not c['qled'] and p['price'] in prices:
                # stocul vechi "8 Core 4G" respecta aceeasi grila
                votes.append(prices.index(p['price']))
    if not votes:
        return 1
    return max(set(votes), key=votes.count)


def build_plan(data, keep_orphans):
    allp = data['all']
    by_name = {}
    for p in allp:
        by_name.setdefault(p['name'], p)
    skus = {p.get('sku') for p in allp if p.get('sku')}
    slugs = {p['slug'] for p in allp}

    # donatori de continut: un produs canonic pe fiecare (configuratie, diagonala)
    donors = {}
    for p in allp:
        c = cfg_of(p)
        if not c or not c['canonical'] or (p.get('imageCount') or 0) < 15:
            continue
        key = (c['cfg'], c['diag'] if not c['cfg'][3] else None)
        donors.setdefault(key, []).append(p)

    plan = {'delete': [], 'create': [], 'notes': [], 'ramas': []}
    for m in data['models']:
        fams = {}
        for p in m['products']:
            c = cfg_of(p)
            if not c:
                plan['notes'].append(f"{m['model']}: nume neinterpretabil — {p['name']}")
                continue
            p['_cfg'] = c
            fams.setdefault(c['prefix'], []).append(p)

        for prefix, prods in fams.items():
            # ramele familiei = diagonalele produselor non-2K (sau ale 2K-urilor cu «9 Inch»)
            diags = sorted({p['_cfg']['diag'] for p in prods
                            if p['_cfg']['diag'] in RAMA_DIAGS})
            if not diags:
                # familie fara nicio rama moderna (numai stoc vechi): totul se dezactiveaza
                rec = {'family': prefix, 'diag': '-', 'model': m['model'], 'url': m['url'],
                       'tier': 1, 'n_now': len(prods), 'n_after': 0, 'create': [],
                       'delete': [{'id': p['_id'], 'name': p['name'], 'sku': p.get('sku'),
                                   'slug': p['slug'], 'price': p['price'],
                                   'images': p.get('imageCount'),
                                   'reason': 'stoc vechi (familie fara set canonic)'}
                                  for p in prods]}
                plan['ramas'].append(rec)
                plan['delete'] += rec['delete']
                continue
            ramas = {d: {'family': prefix, 'diag': d, 'model': m['model'], 'brand': m['brand'],
                         'url': m['url'], 'products': [], 'tag_2k_diag': False} for d in diags}
            floating = []
            for p in prods:
                d = p['_cfg']['diag']
                if d in ramas:
                    ramas[d]['products'].append(p)
                    if p['_cfg']['is2k']:
                        ramas[d]['tag_2k_diag'] = True
                elif d:
                    # diagonala care nu e rama (7"/8"): merge la rama principala ca stoc vechi
                    ramas[diags[0]]['products'].append(p)
                else:
                    floating.append(p)          # 2K fara diagonala in nume
            if floating:
                if len(ramas) == 1:
                    target = diags[0]
                elif prefix in FLOAT_2K:
                    target = FLOAT_2K[prefix]
                else:
                    # 2K-urile simple apartin ramei care nu are deja un set 2K
                    free = [d for d in diags if not ramas[d]['tag_2k_diag']]
                    target = free[0] if len(free) == 1 else None
                if target is None:
                    plan['notes'].append(
                        f"{prefix}: {len(floating)} produse 2K fara diagonala, "
                        f"iar familia are ramele {diags} — nedecis, lasate pe loc")
                    continue
                ramas[target]['products'] += floating
                # rama care tine setul «2K ...» simplu il pastreaza asa; celelalte isi
                # scriu 2K-urile cu diagonala in nume
                for d2 in diags:
                    if d2 != target:
                        ramas[d2]['tag_2k_diag'] = True

            for d, rama in ramas.items():
                rama['tier'] = tier_of(rama)
                present = {}
                for p in rama['products']:
                    if p['_cfg']['canonical'] and p.get('sku') not in FORCE_DELETE:
                        present.setdefault(p['_cfg']['cfg'], []).append(p)
                # 1. ce se dezactiveaza
                dele = []
                for p in rama['products']:
                    if p.get('sku') in FORCE_DELETE:
                        dele.append((p, FORCE_DELETE[p['sku']]))
                    elif not p['_cfg']['canonical']:
                        dele.append((p, 'stoc vechi (' + (p['_cfg']['label'] +
                                     (' ' + p['_cfg']['extra'] if p['_cfg']['extra'] else '') +
                                     (' QLED' if p['_cfg']['qled'] else '')).strip() + ')'))
                for cfg, ps in present.items():
                    if len(ps) > 1:
                        # dublura reala doar daca au acelasi set de poze; altfel sunt rame
                        # diferite scrise la fel si le decide Alex, nu scriptul
                        same, other = same_images(ps)
                        if other:
                            plan['notes'].append(
                                f'{prefix} [{d}"]: {len(ps)} produse {cfg_label(cfg, d)} cu '
                                'POZE DIFERITE (rame diferite?) — lasate pe loc: ' +
                                ', '.join(f'{p.get("sku")}/{p.get("imageCount")}p' for p in ps))
                            present[cfg] = [ps[0]]
                            continue
                        keep = pick_keeper(ps)
                        for p in ps:
                            if p is not keep:
                                dele.append((p, f'dublura identica a {keep.get("sku")}'))
                        present[cfg] = [keep]
                # 2. ce se creeaza
                create = []
                for cfg in CANON:
                    if cfg in present:
                        continue
                    src = image_source(rama, cfg)
                    borrowed = False
                    if not src:
                        src, borrowed = image_source_family(ramas, cfg), True
                    donor = pick_donor(donors, cfg, d, m['brand'])
                    if not src or not donor:
                        plan['notes'].append(
                            f"{prefix} [{d}\"]: nu pot crea {cfg_label(cfg, d)} — "
                            f"{'fara poze in grupa ' + img_group(cfg) if not src else 'fara donator de continut'}")
                        continue
                    name = cfg_name(prefix, cfg, d, rama['tag_2k_diag'])
                    ident = sorted(rama['products'],
                                   key=lambda p: (not p['_cfg']['canonical'], p['name']))[0]
                    create.append({'name': name, 'cfg': list(cfg), 'diag': d,
                                   'price': PRICES[cfg][rama['tier']],
                                   'images_from': {'id': src['_id'], 'name': src['name'],
                                                   'n': src.get('imageCount'),
                                                   'alta_rama': borrowed},
                                   'identity_from': {'id': ident['_id'], 'name': ident['name']},
                                   'sku_from': {'sku': src.get('sku'),
                                                'ram': src['_cfg']['cfg'][0],
                                                'skus': [p.get('sku') for p in rama['products']
                                                         if p.get('sku') and not p['_cfg']['is2k']]
                                                        or [p.get('sku') for p in rama['products']
                                                            if p.get('sku')]},
                                   'content_from': {'id': donor['_id'], 'name': donor['name']},
                                   'model': m['model'], 'url': m['url']})
                rama_rec = {'family': prefix, 'diag': d, 'model': m['model'], 'url': m['url'],
                            'tier': rama['tier'], 'n_now': len(rama['products']),
                            'n_after': len(rama['products']) - len(dele) + len(create),
                            'delete': [{'id': p['_id'], 'name': p['name'], 'sku': p.get('sku'),
                                        'slug': p['slug'], 'price': p['price'],
                                        'images': p.get('imageCount'), 'reason': why}
                                       for p, why in dele],
                            'create': create}
                plan['ramas'].append(rama_rec)
                plan['delete'] += rama_rec['delete']
                plan['create'] += create

    # SKU-uri si sluguri unice pentru produsele noi
    for c in plan['create']:
        c['slug'] = unique(slugify(c['name']), slugs)
        c['sku'] = unique(make_sku(c), skus)
    return plan


def same_images(ps):
    """(toate au acelasi set de poze, exista macar unul diferit)"""
    sets = []
    for p in ps:
        sets.append({re.sub(r'^.*/', '', im.get('url', ''))
                     for im in (full(p['_id']).get('images') or [])})
    return sets[0], any(s != sets[0] for s in sets[1:])


def pick_keeper(ps):
    """dintre doua produse identice il pastreaza pe cel cu slug-ul potrivit numelui,
       apoi pe cel cu numele fara token dublat, apoi pe primul"""
    exact = [p for p in ps if p['slug'] == slugify(p['name'])]
    if len(exact) == 1:
        return exact[0]
    clean = [p for p in ps if not re.search(r'\b(\d+ inch)\b.*\b\1\b', p['name'], re.I)]
    if len(clean) == 1:
        return clean[0]
    return sorted(ps, key=lambda p: (len(p['name']), p.get('sku') or ''))[0]


def image_source(rama, cfg):
    """produsul din aceeasi rama de la care se iau pozele, pe grupa partajata"""
    want = img_group(cfg)
    cands = [p for p in rama['products']
             if img_group(p['_cfg']['cfg']) == want and (p.get('imageCount') or 0) > 0]
    if not cands:
        return None
    # intai un produs canonic, apoi cel cu cele mai multe poze
    cands.sort(key=lambda p: (not p['_cfg']['canonical'], -(p.get('imageCount') or 0)))
    return cands[0]


def image_source_family(ramas, cfg):
    """rezerva: aceeasi grupa, dar de la o alta rama a familiei (2K-ul unei rame nu
       exista nicaieri altundeva — cazul Peugeot 208 9\"). Se marcheaza in raport."""
    for r in ramas.values():
        s = image_source(r, cfg)
        if s:
            return s
    return None


def pick_donor(donors, cfg, diag, brand):
    cands = donors.get((cfg, None if cfg[3] else diag)) or []
    if not cands:
        return None
    cands = sorted(cands, key=lambda p: (not p['name'].startswith(PREFIX + brand), p['name']))
    return cands[0]


def make_sku(c):
    """intai dupa modelul fratelui din aceeasi grupa (ii schimba doar marcajul de RAM,
       ca in duplicateConfig.py), altfel din prefixul comun al SKU-urilor familiei"""
    ram, sto, cores, is2k = c['cfg']
    sib, sib_ram = c['sku_from']['sku'], c['sku_from']['ram']
    if sib and f'{sib_ram}GB' in sib:
        head, tail = sib.rsplit(f'{sib_ram}GB', 1)
        return f'{head}{ram}GB{tail}'
    # SKU-urile non-2K poarta marcajul de generatie (LOGAN2123...), deci prefixul lor
    # comun e baza buna pentru familie
    skus = [s for s in c['sku_from']['skus'] if s]
    base = os.path.commonprefix(skus) if len(skus) > 1 else (skus[0] if skus else '')
    if len(base) < 4:
        base = re.sub(r'[^A-Z0-9]', '', c['name'][len(PREFIX):].split(' inch')[0]
                      .replace('2K', '').upper())[:16]
    suffix = '2KPO' if is2k else ('OPO' if cores.startswith('8') else 'QPO')
    return f'{base}{ram}GB{suffix}'


def unique(value, used):
    out, i = value, 2
    while out in used:
        out = f'{value}{i}'
        i += 1
    used.add(out)
    return out


# ---------------------------------------------------------------- aplicarea
def build_doc(c):
    ident = full(c['identity_from']['id'])
    donor = full(c['content_from']['id'])
    imgs = full(c['images_from']['id']).get('images') or []

    doc = {k: v for k, v in copy.deepcopy(ident).items() if k not in DROP}
    for f in CONTENT:
        if f in donor:
            doc[f] = copy.deepcopy(donor[f])
    sd = doc.get('structuredDescription')
    if isinstance(sd, dict):
        sd.pop('parsedAt', None)
        for sec in sd.get('sections') or []:
            sec.pop('_id', None)
    ro = copy.deepcopy(donor.get('romanianSpecs') or {})
    ro.pop('scrapedAt', None)
    gen = copy.deepcopy((ident.get('romanianSpecs') or {}).get('general') or {})
    gen['sku'] = c['sku']
    ro['general'] = gen
    # diagonala e a ramei, nu a donatorului — si produsele 2K o poarta (vezi «10 Inch»
    # pe 2K-urile familiilor de 10 inch)
    if isinstance(ro.get('display'), dict):
        ro['display']['diagonalaDisplay'] = f"{c['diag']} Inch"
    doc['romanianSpecs'] = ro

    doc['name'] = c['name']
    doc['slug'] = c['slug']
    doc['sku'] = c['sku']
    doc['price'] = c['price']
    doc['originalPrice'] = None
    doc['discount'] = 0
    doc['status'] = 'active'
    doc['images'] = [{'url': im['url'], 'alt': c['name'], 'isPrimary': i == 0}
                     for i, im in enumerate(imgs)]
    specs = []
    for s in copy.deepcopy(ident.get('specifications') or []):
        if s.get('key') == 'MPN':
            s['value'] = c['sku']
        if s.get('key') == 'GTIN':
            continue
        specs.append(s)
    doc['specifications'] = specs
    ram, sto, cores, is2k = c['cfg']
    car = c['name'][len(PREFIX):].split(' 2K')[0].split(f" {c['diag']} inch")[0]
    screen = '2K' if is2k else f"{c['diag']}\""
    doc['seoTitle'] = (f'Navigație {car} {screen} {ram}+{sto}GB '
                       f'{"8C" if cores.startswith("8") else "4C"} | PilotOn')[:70]
    doc['seoDescription'] = (
        f'Navigație {car} cu Android: ecran {"2K" if is2k else str(c["diag"]) + " inch"}, '
        f'{ram} GB RAM, {sto} GB stocare, {"8" if cores.startswith("8") else "4"} Core, '
        f'CarPlay și Android Auto wireless. Livrare rapidă în România.')
    return doc


def report(plan):
    for r in plan['ramas']:
        if not r['delete'] and not r['create']:
            continue
        print('=' * 100)
        print(f"{r['family']}  [{r['diag']} inch, treapta "
              f"{['mica', 'medie', 'mare'][r['tier']]}]   {r['n_now']} -> {r['n_after']}")
        for d in r['delete']:
            print(f"   - {d['name'][len(PREFIX):]:66} {d['price']:>5} lei  "
                  f"{d['images']:>2}p   {d['reason']}")
        for c in r['create']:
            print(f"   + {c['name'][len(PREFIX):]:66} {c['price']:>5} lei      "
                  f"poze <- {c['images_from']['name'][len(PREFIX):]} ({c['images_from']['n']}p)")
            print(f"     {'':66}            text <- {c['content_from']['name'][len(PREFIX):]}")
    print('=' * 100)
    print(f"TOTAL: {len(plan['delete'])} de dezactivat, {len(plan['create'])} de creat")
    for n in plan['notes']:
        print('  ATENTIE:', n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--run', action='store_true')
    ap.add_argument('--refresh', action='store_true', help='reia datele de pe API')
    ap.add_argument('--only-create', action='store_true')
    ap.add_argument('--only-delete', action='store_true')
    ap.add_argument('--keep-orphans', action='store_true')
    args = ap.parse_args()
    if not (args.plan or args.run):
        sys.exit('Foloseste --plan sau --run.')

    if args.plan:
        plan = build_plan(load(args.refresh), args.keep_orphans)
        json.dump(plan, open(PLAN, 'w'), ensure_ascii=False, indent=1)
        report(plan)
        print('\nplan ->', PLAN)
        return

    plan = json.load(open(PLAN))
    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    log('start', create=len(plan['create']), delete=len(plan['delete']))

    made = failed = 0
    if not args.only_delete:
        for c in plan['create']:
            try:
                doc = build_doc(c)
                http(f'{API}/api/products', data=json.dumps(doc).encode(), headers=hdr)
                made += 1
                log('creat', name=c['name'], slug=c['slug'], sku=c['sku'], price=c['price'],
                    images=len(doc['images']))
                print(f"   + {c['name']}")
            except Exception as e:
                failed += 1
                log('eroare-creare', name=c['name'], error=str(e)[:200])
                print(f"   !! {c['name']}: {str(e)[:140]}")

    gone = 0
    if not args.only_create:
        for d in plan['delete']:
            try:
                http(f"{API}/api/products/{d['id']}", method='DELETE', headers=hdr)
                gone += 1
                log('dezactivat', name=d['name'], sku=d['sku'], id=d['id'], reason=d['reason'])
            except Exception as e:
                failed += 1
                log('eroare-stergere', name=d['name'], error=str(e)[:200])
                print(f"   !! {d['name']}: {str(e)[:140]}")

    print(f'\nGata: {made} create, {gone} dezactivate, {failed} esuate. Jurnal: {LOG}')


if __name__ == '__main__':
    main()

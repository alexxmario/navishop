#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genereaza seoTitle + seoDescription in romana pentru toate produsele live,
prin API-ul de productie (https://api.navi.piloton.ro).

  python3 backend/scripts/generateSeo.py --plan            # doar genereaza + scrie seo-plan.json, nu modifica nimic
  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/generateSeo.py [--limit N] [--overwrite]

Fara --overwrite, produsele care au deja seoTitle SI seoDescription sunt sarite.
Reluabil: starea per-slug e in seo-apply-state.json.
"""
import json, os, re, sys, time, argparse, urllib.request, urllib.error, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
STATE_FILE = os.path.join(HERE, 'seo-apply-state.json')
LOG_FILE = os.path.join(HERE, 'generate-seo-log.jsonl')
PLAN_FILE = os.path.join(HERE, 'seo-plan.json')

TITLE_MAX = 62          # tinta Google ~60 caractere
DESC_MAX = 165          # tinta Google ~155-160 caractere


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG_FILE, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={str(v)[:80]}' for k, v in kw.items()), flush=True)


def http(url, data=None, headers=None, method=None, timeout=60, retries=4):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, method=method,
                                         headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read(), None
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', 'ignore')[:300]
            if e.code == 400:
                return None, f'400: {body}'
            last = f'{e.code}: {body}'
        except Exception as e:
            last = str(e)
        time.sleep(3 * (attempt + 1))
    return None, last


# ---------------------------------------------------------------- parsare nume

RE_SCREEN = re.compile(r'(\d+(?:[.,]\d+)?)\s*inch', re.I)
RE_RAM_STORAGE = re.compile(r'(\d+)\s*GB\s+(\d+)\s*GB', re.I)
RE_CORES = re.compile(r'(\d+)\s*CORE', re.I)
RE_2K = re.compile(r'\b2K\b', re.I)
RE_TESLA = re.compile(r'\btip\s+tesla\b', re.I)
RE_YEARS = re.compile(r'\b((?:19|20)\d{2})\s*-\s*((?:19|20)\d{2})\b')
RE_YEAR = re.compile(r'\b((?:19|20)\d{2})\b')
NAME_PREFIX = re.compile(r'^\s*navigatie\s+piloton\s+', re.I)


def parse_nav_name(name):
    """Extrage masina/anii/specificatiile din numele standard al unei navigatii."""
    rest = NAME_PREFIX.sub('', name)
    info = {'car': None, 'years': None, 'screen': None, 'ram': None,
            'storage': None, 'cores': None, 'is2k': bool(RE_2K.search(rest)),
            'tesla': bool(RE_TESLA.search(rest))}
    # cele 89 de produse Tesla vechi au "Tip Tesla" la INCEPUTUL numelui
    rest = re.sub(r'^\s*tip\s+tesla\s+', '', rest, flags=re.I)

    m = RE_SCREEN.search(rest)
    if m:
        info['screen'] = m.group(1).replace(',', '.')
    m = RE_RAM_STORAGE.search(rest)
    if m:
        info['ram'], info['storage'] = m.group(1), m.group(2)
    m = RE_CORES.search(rest)
    if m:
        info['cores'] = m.group(1)
    m = RE_YEARS.search(rest)
    if m:
        info['years'] = f'{m.group(1)}-{m.group(2)}'
    elif RE_YEAR.search(rest):
        info['years'] = RE_YEAR.search(rest).group(1)

    # masina = tot ce e inainte de primul token de specificatie (ani/ecran/RAM/2K)
    cut = len(rest)
    for rx in (RE_YEARS, RE_YEAR, RE_SCREEN, RE_RAM_STORAGE, RE_CORES, RE_2K, RE_TESLA):
        m = rx.search(rest)
        if m:
            cut = min(cut, m.start())
    car = rest[:cut].strip(' ,-–')
    info['car'] = car or None
    return info


# ------------------------------------------------------------- generare texte

NAV_CATEGORIES = {'navigatii-gps', 'gps', 'carplay-android'}


def build_title(product, info):
    """Titlu <= ~60 caractere, cu variante din ce in ce mai scurte."""
    car, years = info.get('car'), info.get('years')
    if not car:
        return trim_title(f'{clean_name(product["name"])} | PilotOn')

    spec_bits = []
    if info.get('screen'):
        spec_bits.append(f'{info["screen"]}"')
    if info.get('is2k'):
        spec_bits.append('2K')
    if info.get('tesla'):
        spec_bits.append('Tip Tesla')
    if info.get('ram') and info.get('storage'):
        spec_bits.append(f'{info["ram"]}+{info["storage"]}GB')
    if info.get('cores'):
        # fara nucleele in titlu, variantele 4/8 CORE cu acelasi RAM ar avea titluri identice
        spec_bits.append(f'{info["cores"]}C')
    specs = ' '.join(spec_bits)
    yshort = re.sub(r'\b(?:19|20)(\d{2})\s*-\s*(?:19|20)(\d{2})\b',
                    r"\1-\2", years) if years else None

    candidates = []
    if years and specs:
        candidates.append(f'Navigație {car} {years} {specs} | PilotOn')
        candidates.append(f'Navigație {car} {yshort} {specs} | PilotOn')
        candidates.append(f'Navigație {car} {years} {specs}')
        candidates.append(f'Navigație {car} {yshort} {specs}')
    if specs:
        candidates.append(f'Navigație {car} {specs} | PilotOn')
        candidates.append(f'Navigație {car} {specs}')
    if years:
        candidates.append(f'Navigație {car} {years} | PilotOn')
        candidates.append(f'Navigație {car} {years}')
    candidates.append(f'Navigație {car} | PilotOn')
    candidates.append(f'Navigație {car}')

    for c in candidates:
        if len(c) <= TITLE_MAX:
            return c
    return trim_title(candidates[-1])


def build_description(product, info):
    car, years = info.get('car'), info.get('years')
    if product.get('category') in NAV_CATEGORIES and car:
        target = f'{car} {years}' if years else car
        screen = f'ecran {info["screen"]} inch' if info.get('screen') else 'ecran 2K' if info.get('is2k') else 'ecran mare tactil'
        if info.get('is2k') and info.get('screen'):
            screen += ' 2K'
        if info.get('tesla'):
            screen += ' vertical Tip Tesla'
        hw = ''
        if info.get('ram') and info.get('storage'):
            hw = f', {info["ram"]} GB RAM, {info["storage"]} GB stocare'
        if info.get('cores'):
            hw += f', {info["cores"]} Core'
        desc = (f'Navigație {target} cu Android: {screen}{hw}, CarPlay și Android Auto '
                f'wireless, GPS. Montaj Plug & Play, livrare rapidă în toată România.')
        if len(desc) > DESC_MAX:
            desc = (f'Navigație {target} cu Android: {screen}{hw}, CarPlay și '
                    f'Android Auto wireless. Livrare rapidă în România.')
        if len(desc) > DESC_MAX:
            desc = (f'Navigație {target} cu Android, {screen}{hw}. '
                    f'Livrare rapidă în România.')
        return desc

    # produse non-navigatie: template pe categorie
    name = clean_name(product['name'])
    per_cat = {
        'camere-marsarier': f'{name} de la PilotOn – imagine clară pentru parcare sigură. '
                            f'Montaj ușor, compatibilitate largă. Livrare rapidă în toată România.',
        'module-carplay':   f'{name} – adaugă CarPlay și Android Auto wireless în mașina ta. '
                            f'De la PilotOn, cu livrare rapidă în toată România și garanție.',
        'portbagaj-electric': f'{name} – deschidere electrică a portbagajului, confort sporit. '
                              f'Montaj profesional, livrare rapidă în toată România.',
        'lumini-ambientale': f'{name} – lumini ambientale premium pentru interiorul mașinii. '
                             f'De la PilotOn, cu livrare rapidă în toată România și garanție.',
    }
    desc = per_cat.get(product.get('category'),
                       f'{name} de la PilotOn. Produs de calitate pentru mașina ta, montaj facil. '
                       f'Comandă online cu livrare rapidă în toată România și garanție.')
    return desc if len(desc) <= DESC_MAX else desc[:DESC_MAX].rsplit(' ', 1)[0] + '.'


def clean_name(name):
    return re.sub(r'\s+', ' ', name).strip()


def trim_title(title):
    if len(title) <= TITLE_MAX:
        return title
    return title[:TITLE_MAX].rsplit(' ', 1)[0]


def generate(product):
    info = parse_nav_name(product['name']) if product.get('category') in NAV_CATEGORIES \
        else {'car': None}
    return build_title(product, info), build_description(product, info)


# ------------------------------------------------------------------- rulare

def fetch_all_products():
    products, page = [], 1
    while True:
        # sortare pe _id (indexat) — sortarea pe createdAt pica in productie
        # peste ~1.800 de documente (limita de memorie la sort in Mongo)
        qs = urllib.parse.urlencode({'page': page, 'limit': 100,
                                     'sortBy': '_id', 'sortOrder': 'asc'})
        raw, err = http(f'{API}/api/products?{qs}')
        if err:
            sys.exit(f'GET products p{page}: {err}')
        data = json.loads(raw)
        batch = data.get('products', data if isinstance(data, list) else [])
        products.extend(batch)
        pag = data.get('pagination', {})
        print(f'  pagina {page}: {len(batch)} produse (total {len(products)})', flush=True)
        if not pag.get('hasNextPage') or not batch:
            break
        page += 1
    return products


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', action='store_true', help='doar genereaza, scrie seo-plan.json')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--overwrite', action='store_true',
                    help='regenereaza si pentru produsele care au deja SEO')
    args = ap.parse_args()

    print('Descarc produsele...')
    products = fetch_all_products()
    print(f'Total produse active: {len(products)}')

    plan = []
    for p in products:
        has_seo = bool((p.get('seoTitle') or '').strip()) and bool((p.get('seoDescription') or '').strip())
        if has_seo and not args.overwrite:
            continue
        title, desc = generate(p)
        plan.append({'id': p.get('_id'), 'slug': p.get('slug'), 'name': p.get('name'),
                     'category': p.get('category'), 'seoTitle': title, 'seoDescription': desc,
                     'titleLen': len(title), 'descLen': len(desc)})

    print(f'De actualizat: {len(plan)} produse')
    if args.plan:
        json.dump({'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%S'), 'items': plan},
                  open(PLAN_FILE, 'w'), ensure_ascii=False, indent=1)
        over_t = [x for x in plan if x['titleLen'] > TITLE_MAX]
        over_d = [x for x in plan if x['descLen'] > DESC_MAX]
        print(f'\nScris {PLAN_FILE}')
        print(f'Titluri peste {TITLE_MAX} caractere: {len(over_t)} | descrieri peste {DESC_MAX}: {len(over_d)}')
        print('\nExemple:')
        for x in plan[:12]:
            print(f'  [{x["titleLen"]}] {x["seoTitle"]}')
            print(f'  [{x["descLen"]}]   {x["seoDescription"]}\n')
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD (sau ruleaza cu --plan)')
    raw, err = http(f'{API}/api/auth/login', json.dumps({'email': email, 'password': pw}).encode(),
                    {'Content-Type': 'application/json'})
    if err:
        sys.exit(f'login: {err}')
    token = json.loads(raw)['token']
    log('login-ok')

    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}
    n = 0
    for x in plan:
        if state.get(x['slug'], {}).get('status') == 'done' and not args.overwrite:
            continue
        if args.limit and n >= args.limit:
            break
        n += 1
        body = json.dumps({'seoTitle': x['seoTitle'], 'seoDescription': x['seoDescription']}).encode()
        raw, err = http(f'{API}/api/products/{x["id"]}', body,
                        {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
                        method='PUT', timeout=90)
        if err:
            state[x['slug']] = {'status': 'error', 'error': err}
            log('update-error', slug=x['slug'], error=err)
        else:
            state[x['slug']] = {'status': 'done', 'title': x['seoTitle']}
            log('updated', slug=x['slug'], title=x['seoTitle'])
        json.dump(state, open(STATE_FILE, 'w'), indent=1)
        time.sleep(0.15)

    done = sum(1 for s in state.values() if s.get('status') == 'done')
    errs = {k: v for k, v in state.items() if v.get('status') == 'error'}
    print(f'\nActualizate: {done} | erori: {len(errs)}')
    if errs:
        print('Erori (primele 10):')
        for k, v in list(errs.items())[:10]:
            print(f'  {k}: {v["error"]}')


if __name__ == '__main__':
    main()

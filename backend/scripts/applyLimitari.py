#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplica limitarile la nivel de MASINA pe produsele live (romanianSpecs.additional.limitari),
pornind de la backend/scripts/limitari-library.json.

  python3 backend/scripts/applyLimitari.py --plan               # doar potrivire + limitari-plan.json
  python3 backend/scripts/applyLimitari.py --plan --include-review
  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/applyLimitari.py [--limit N] [--include-review] [--fix-package]

Implicit se publica DOAR intrarile cu status='publish' din biblioteca. Intrarile
'review' intra in plan (ca sa fie verificate) dar nu se scriu decat cu --include-review.

--fix-package rescrie si frazele din continutPachet care promit "toate cablajele
necesare pentru montaj", pentru produsele care primesc o limitare de tip cablu/adaptor.

Reluabil: starea per-slug e in limitari-apply-state.json.
"""
import json, os, re, sys, time, argparse, unicodedata, urllib.request, urllib.error, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LIB_FILE = os.path.join(HERE, 'limitari-library.json')
STATE_FILE = os.path.join(HERE, 'limitari-apply-state.json')
LOG_FILE = os.path.join(HERE, 'apply-limitari-log.jsonl')
PLAN_FILE = os.path.join(HERE, 'limitari-plan.json')

NAV_CATEGORIES = {'navigatii-gps', 'gps', 'carplay-android'}

# fraza din continutPachet care contrazice o limitare de tip "ai nevoie de cablu separat"
PACKAGE_CLAIM = re.compile(
    r'Toate\s+navigatiile\s+tip\s+TABLETA\s+contin\s+Rama\s+Adaptoare\s+si\s+'
    r'toate\s+cablajele\s+necesare\s+pentru\s+montaj\s*!', re.I)
PACKAGE_REPLACEMENT = ('Toate navigatiile tip TABLETA contin Rama Adaptoare si cablajele '
                       'standard pentru montaj. Vezi secțiunea Limitări — pe unele versiuni '
                       'de mașină este nevoie de un adaptor suplimentar.')

CABLE_RULES = {'nav-originala-adaptor', 'amplificator-fabrica', 'fibra-optica-most', 'clima-display'}


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


# ------------------------------------------------------- normalizare masina/ani

NAME_PREFIX = re.compile(r'^\s*navigatie\s+piloton\s+', re.I)
RE_TESLA_PREFIX = re.compile(r'^\s*tip\s+tesla\s+', re.I)
YEARS_RE = re.compile(r'(dupa\s+\d{4}|\d{4}\s*-\s*\d{4}|\d{4}\+)', re.I)
# tokeni de hardware/trim care nu fac parte din numele masinii
STOP_TOKENS = re.compile(
    r'\b(\d+(?:[.,]\d+)?\s*inch|2k|tip\s+tesla|\d+\s*gb|\d+\s*core|rama\s+\d+\s*inch|'
    r'mica|mare|black|silver|white|grey|clima|gt|gp|high|low)\b', re.I)


def strip_diacritics(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


def norm_car(s):
    """'Honda CR-V IV' / 'Honda CRV' -> 'honda crv' (comparabile)."""
    s = strip_diacritics((s or '').lower())
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    s = re.sub(r'\bcr v\b', 'crv', s)
    s = re.sub(r'\bhr v\b', 'hrv', s)
    s = re.sub(r'\bfr v\b', 'frv', s)
    return re.sub(r'\s+', ' ', s).strip()


def parse_years(txt):
    """'2012-2018' -> (2012,2018); 'dupa 2012' -> (2012,2099)."""
    t = (txt or '').lower()
    m = re.search(r'(\d{4})\s*-\s*(\d{4})', t)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r'dupa\s+(\d{4})', t) or re.search(r'(\d{4})\s*\+', t)
    if m:
        return int(m.group(1)), 2099
    m = re.search(r'(\d{4})', t)
    if m:
        return int(m.group(1)), int(m.group(1))
    return None, None


def parse_product(name):
    """Scoate (masina, an_de_la, an_pana_la) din numele unei navigatii."""
    rest = NAME_PREFIX.sub('', (name or '').strip())
    rest = RE_TESLA_PREFIX.sub('', rest)
    m = YEARS_RE.search(rest)
    if not m:
        return None, None, None
    car = rest[:m.start()].strip()
    car = STOP_TOKENS.sub('', car).strip()
    y1, y2 = parse_years(m.group(1))
    return norm_car(car), y1, y2


def overlaps(a1, a2, b1, b2):
    if None in (a1, a2, b1, b2):
        return False
    return a1 <= b2 and b1 <= a2


def match_entry(entry, car, y1, y2):
    """True daca produsul (car,y1,y2) cade sub intrarea din biblioteca."""
    if not overlaps(y1, y2, entry.get('yearFrom'), entry.get('yearTo')):
        return False
    cands = [norm_car(c) for c in (entry.get('matchCar') or [entry.get('car', '')])]
    return any(car == c or car.startswith(c + ' ') or c == car for c in cands if c)


def compose_text(lib, rules):
    parts = [lib['templates'][r]['text'] for r in rules if r in lib['templates']]
    return ' '.join(parts)


# ------------------------------------------------------------------- produse

def fetch_all_products():
    products, page = [], 1
    while True:
        # sortare pe _id (indexat) — paginarea adanca pe createdAt pica in productie
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
    ap.add_argument('--plan', action='store_true', help='doar potrivire, scrie limitari-plan.json')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--include-review', action='store_true',
                    help='aplica si intrarile cu status=review (implicit doar publish)')
    ap.add_argument('--fix-package', action='store_true',
                    help='rescrie fraza "toate cablajele necesare" din continutPachet')
    ap.add_argument('--overwrite', action='store_true',
                    help='suprascrie si produsele care au deja limitari')
    args = ap.parse_args()

    lib = json.load(open(LIB_FILE, encoding='utf-8'))
    entries = lib['entries']
    allowed = {'publish'} | ({'review'} if args.include_review else set())
    print(f'Biblioteca: {len(entries)} intrari '
          f'({sum(1 for e in entries if e["status"] == "publish")} publish, '
          f'{sum(1 for e in entries if e["status"] == "review")} review)')

    print('Descarc produsele...')
    products = fetch_all_products()
    print(f'Total produse active: {len(products)}')

    plan, unmatched_cars = [], {}
    for p in products:
        if p.get('category') not in NAV_CATEGORIES:
            continue
        car, y1, y2 = parse_product(p.get('name'))
        if not car:
            continue
        hits = [e for e in entries if match_entry(e, car, y1, y2)]
        if not hits:
            unmatched_cars.setdefault(f'{car} {y1}-{y2}', 0)
            unmatched_cars[f'{car} {y1}-{y2}'] += 1
            continue
        rules, srcs, statuses = [], [], []
        for e in hits:
            for r in e['rules']:
                if r not in rules:
                    rules.append(r)
            srcs.append(e['source'])
            statuses.append(e['status'])
        text = compose_text(lib, rules)
        existing = ((p.get('romanianSpecs') or {}).get('additional') or {}).get('limitari') or ''
        pkg = ((p.get('romanianSpecs') or {}).get('package') or {}).get('continutPachet') or ''
        needs_pkg_fix = bool(PACKAGE_CLAIM.search(pkg)) and bool(set(rules) & CABLE_RULES)
        plan.append({
            'id': p.get('_id'), 'slug': p.get('slug'), 'name': p.get('name'),
            'car': car, 'years': f'{y1}-{y2}',
            'entries': [e['id'] for e in hits], 'rules': rules,
            'status': 'review' if 'review' in statuses else 'publish',
            'source': '; '.join(srcs),
            'limitari': text,
            'hadLimitari': bool(existing),
            'needsPackageFix': needs_pkg_fix,
        })

    pub = [x for x in plan if x['status'] == 'publish']
    rev = [x for x in plan if x['status'] == 'review']
    print(f'\nPotriviri: {len(plan)} produse  ({len(pub)} publish / {len(rev)} review)')
    print(f'Produse-navigatie fara nicio intrare in biblioteca: '
          f'{sum(unmatched_cars.values())} (in {len(unmatched_cars)} grupuri masina+ani)')
    print(f'Necesita si corectia continutPachet: {sum(1 for x in plan if x["needsPackageFix"])}')

    if args.plan:
        json.dump({'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
                   'library': {'version': lib['version'], 'updatedAt': lib['updatedAt']},
                   'matched': plan,
                   'uncoveredCarGroups': dict(sorted(unmatched_cars.items(),
                                                     key=lambda kv: -kv[1]))},
                  open(PLAN_FILE, 'w'), ensure_ascii=False, indent=1)
        print(f'\nScris {PLAN_FILE}')
        for x in plan[:8]:
            print(f'\n  [{x["status"]}] {x["name"]}')
            print(f'    reguli: {", ".join(x["rules"])}')
            print(f'    text:   {x["limitari"]}')
        return

    todo = [x for x in plan if x['status'] in allowed]
    if not todo:
        sys.exit('Nimic de aplicat. Intrarile sunt pe status=review — ruleaza cu --include-review '
                 'dupa ce le-ai verificat.')

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD (sau ruleaza cu --plan)')
    raw, err = http(f'{API}/api/auth/login', json.dumps({'email': email, 'password': pw}).encode(),
                    {'Content-Type': 'application/json'})
    if err:
        sys.exit(f'login: {err}')
    token = json.loads(raw)['token']
    log('login-ok', produse=len(todo))

    # produsele vin din API fara romanianSpecs complet in listare? le luam per produs la PUT
    by_id = {p['_id']: p for p in products}
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {}
    n = 0
    for x in todo:
        if state.get(x['slug'], {}).get('status') == 'done' and not args.overwrite:
            continue
        if x['hadLimitari'] and not args.overwrite:
            log('skip-are-deja-limitari', slug=x['slug'])
            continue
        if args.limit and n >= args.limit:
            break
        n += 1
        p = by_id[x['id']]
        rs = json.loads(json.dumps(p.get('romanianSpecs') or {}))  # copie
        rs.setdefault('additional', {})['limitari'] = x['limitari']
        if args.fix_package and x['needsPackageFix']:
            pkg = (rs.get('package') or {}).get('continutPachet') or ''
            rs.setdefault('package', {})['continutPachet'] = PACKAGE_CLAIM.sub(PACKAGE_REPLACEMENT, pkg)
        body = json.dumps({'romanianSpecs': rs}).encode()
        raw, err = http(f'{API}/api/products/{x["id"]}', body,
                        {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
                        method='PUT', timeout=90)
        if err:
            state[x['slug']] = {'status': 'error', 'error': err}
            log('update-error', slug=x['slug'], error=err)
        else:
            state[x['slug']] = {'status': 'done', 'rules': x['rules'],
                                'packageFixed': bool(args.fix_package and x['needsPackageFix'])}
            log('updated', slug=x['slug'], rules=','.join(x['rules']))
        json.dump(state, open(STATE_FILE, 'w'), indent=1)
        time.sleep(0.15)

    done = sum(1 for s in state.values() if s.get('status') == 'done')
    errs = {k: v for k, v in state.items() if v.get('status') == 'error'}
    print(f'\nActualizate: {done} | erori: {len(errs)}')
    for k, v in list(errs.items())[:10]:
        print(f'  {k}: {v["error"]}')


if __name__ == '__main__':
    main()

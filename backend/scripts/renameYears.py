#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Corecteaza anii (si, unde e cazul, denumirea generatiei) din numele produselor.

O regula e o pereche baza-veche -> baza-noua, unde "baza" e bucata din nume dintre
"Navigatie PilotOn " si configuratie (9 inch / 10 inch / 2K / Tip Tesla ...). Regula
prinde si variantele de rama/trim: "VW Tiguan 2007-2018 NFL B" urmeaza automat
"VW Tiguan 2007-2018".

Cand redenumirea produce un nume deja folosit, se lipeste numarul de CORE
("8 CORE" -> "8CORE") ca sa nu ramana doua produse cu acelasi titlu — conventia
folosita deja in catalog de duplicateConfig.py. Daca si forma lipita e ocupata,
produsul e redenumit oricum si e raportat la final ca DUBLURA DE NUME.

Slug-ul NU se atinge: e cheie unica in DB, e in URL-urile indexate, iar catalogul
are deja precedent (Qashqai J11, X-Trail 3, Transit) de produse redenumite cu
slug-ul vechi pastrat. SKU-ul, la fel, ramane neschimbat.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/renameYears.py --plan
  python3 backend/scripts/renameYears.py --run
"""
import argparse, json, os, re, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
RULES_FILE = os.path.join(HERE, 'rename-years-rules.json')
PLAN_FILE = os.path.join(HERE, 'rename-years-plan.json')
STATE_FILE = os.path.join(HERE, 'rename-years-state.json')
LOG = os.path.join(HERE, 'rename-years-log.jsonl')

# configuratia incepe la primul dintre aceste jetoane; tot ce e inainte e "baza"
CFG = re.compile(r'\s+(?:2K(?:\s+QLED)?(?:\s+(?:9|10)\s+Inch)?'
                 r'|(?:7|8|9|10|9\.7|8\.8|10\.25|12\.9)\s*(?:inch|Inch)(?:\s+QLED)?)\s')
PREFIX = 'Navigatie PilotOn '
TESLA = 'Tip Tesla '


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


def split_name(name):
    """-> (baza, configuratie, e_tesla) sau None daca numele nu are forma standard"""
    if not name.startswith(PREFIX):
        return None
    rest = name[len(PREFIX):]
    tesla = rest.startswith(TESLA)
    core = rest[len(TESLA):] if tesla else rest
    m = CFG.search(core)
    if not m:
        return None
    return core[:m.start()], core[m.start():], tesla


CORE_TOKEN = re.compile(r'(\d+)(\s*)(CORE|Core|core)\b')


def spellings(cfg):
    """variantele de scriere ale configuratiei, in ordinea preferintei

    Se joaca doar cu spatiul si cu majusculele din "<numar> CORE": "8 CORE",
    "8CORE", "8 Core", "8Core", "8 core", "8core". Sase scrieri sunt de ajuns
    pentru orice contopire (max. 4 produse ajung pe acelasi nume)."""
    m = CORE_TOKEN.search(cfg)
    if not m:
        return [cfg]
    out = [cfg]
    for word in (m.group(3), 'CORE', 'Core', 'core'):
        for sep in (' ', ''):
            alt = cfg[:m.start()] + m.group(1) + sep + word + cfg[m.end():]
            if alt not in out:
                out.append(alt)
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


def build_plan(products, rules):
    """-> (plan, dubluri) — plan e lista de {id, old, new, old_base, new_base}"""
    matches = []
    for p in products:
        s = split_name(p['name'])
        if not s:
            continue
        base, cfg, tesla = s
        for i, (old, new) in enumerate(rules):
            if base == old or base.startswith(old + ' '):
                matches.append((i, p, base, new + base[len(old):], cfg, tesla))
                break

    # cate produse ocupa fiecare nume dupa ce cele redenumite isi elibereaza numele
    taken = {}
    for p in products:
        taken[p['name']] = taken.get(p['name'], 0) + 1
    for _, p, _, _, _, _ in matches:
        taken[p['name']] -= 1

    plan, dupes = [], []
    for i, p, base, new_base, cfg, tesla in sorted(matches, key=lambda m: m[0]):
        stem = PREFIX + (TESLA if tesla else '') + new_base
        new_name = next((stem + c for c in spellings(cfg) if taken.get(stem + c, 0) == 0), None)
        if new_name is None:
            new_name = stem + cfg
            dupes.append((p['name'], new_name))
        taken[new_name] = taken.get(new_name, 0) + 1
        if new_name != p['name']:
            plan.append({'id': p['_id'], 'old': p['name'], 'new': new_name,
                         'old_base': base, 'new_base': new_base})
    return plan, dupes


def main():
    global STATE_FILE
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', action='store_true', help='doar scrie planul, nu atinge productia')
    ap.add_argument('--run', action='store_true')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--rules', default=RULES_FILE)
    ap.add_argument('--state', default=STATE_FILE, help='fisier de stare separat pentru lot')
    args = ap.parse_args()
    if not args.plan and not args.run:
        sys.exit('alege --plan sau --run')

    STATE_FILE = args.state
    rules = json.load(open(args.rules))
    print(f'{len(rules)} reguli; se citeste catalogul...')
    products = fetch_all()
    plan, dupes = build_plan(products, rules)
    json.dump(plan, open(PLAN_FILE, 'w'), ensure_ascii=False, indent=1)

    unmatched = [old for old, _ in rules if not any(x['old_base'] == old or
                 x['old_base'].startswith(old + ' ') for x in plan)]
    print(f'{len(products)} produse, {len(plan)} de redenumit -> {PLAN_FILE}')
    for old in unmatched:
        print(f'  !! nicio potrivire pentru {old!r}')
    tricked = [x for x in plan if re.sub(r'(\d+)(CORE|Core)', r'\1 \2', x['new']) != x['new']
               and re.sub(r'(\d+)(CORE|Core)', r'\1 \2', x['old']) == x['old']]
    print(f'  {len(tricked)} cu CORE lipit ca sa nu se ciocneasca numele')
    if dupes:
        print(f'  !! {len(dupes)} raman cu nume duplicat (si "8 CORE" si "8CORE" erau ocupate):')
        for a, b in dupes:
            print(f'       {a}  ->  {b}')
    if args.plan:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    log('login-ok', planned=len(plan))

    done = set(json.load(open(STATE_FILE))) if os.path.exists(STATE_FILE) else set()
    ok = failed = 0
    todo = [x for x in plan if x['id'] not in done]
    for x in (todo[:args.limit] if args.limit else todo):
        try:
            d = json.loads(http(f"{API}/api/products/id/{x['id']}"))
            d = d.get('product', d)
            patch = {'name': x['new']}
            for f in ('seoTitle', 'seoDescription'):
                if isinstance(d.get(f), str) and x['old_base'] in d[f]:
                    patch[f] = d[f].replace(x['old_base'], x['new_base'])
            if d.get('images'):
                patch['images'] = [{'url': im['url'],
                                    'alt': x['new'] if im.get('alt') == x['old'] else im.get('alt'),
                                    'isPrimary': bool(im.get('isPrimary'))} for im in d['images']]
            http(f"{API}/api/products/{x['id']}", data=json.dumps(patch).encode(),
                 method='PUT', headers=hdr)
            done.add(x['id']); ok += 1
            log('redenumit', id=x['id'], old=x['old'], new=x['new'])
        except Exception as e:
            failed += 1
            log('eroare', id=x['id'], old=x['old'], error=str(e)[:200])
        if (ok + failed) % 50 == 0:
            json.dump(sorted(done), open(STATE_FILE, 'w'))
            print(f'  ... {ok} redenumite, {failed} esuate')
    json.dump(sorted(done), open(STATE_FILE, 'w'))
    print(f'\nGata: {ok} redenumite, {failed} esuate.')


if __name__ == '__main__':
    main()

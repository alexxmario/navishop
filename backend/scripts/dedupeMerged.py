#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dezactiveaza exemplarele redundante ramase dupa contopirile din renameYears.py.

Cand doua intrari de model acopereau aceeasi generatie, redenumirea le-a adus sub
acelasi nume, deosebite doar prin scrierea CORE ("8 CORE" / "8CORE" / "8 Core"...).
Rezultatul: acelasi model listeaza aceeasi configuratie de doua ori, la acelasi pret.
Scriptul pastreaza un singur exemplar din fiecare astfel de grup si le dezactiveaza
pe celelalte.

Grupul = aceeasi baza de nume + aceeasi configuratie (ignorand scrierea CORE) +
acelasi pret. Preturi diferite inseamna produse diferite (ex. perechea 4+64 8C de
1449 si clona R2 de 1649) si nu se ating.

Se pastreaza exemplarul cu cele mai multe poze; la egalitate, cel cu vanzari, apoi
cel al carui slug se potriveste cu numele, apoi cel mai vechi.

Se lucreaza doar pe familiile care au fost tinta unei reguli de redenumire, ca sa
nu se atinga dublurile mai vechi din catalog (BMW iDrive, Ford Kuga/Transit, Viano,
Vitara, Amarok 7 inch) care n-au legatura cu contopirile.

DELETE /api/products/:id doar seteaza status=inactive, deci e reversibil.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/dedupeMerged.py --plan
  python3 backend/scripts/dedupeMerged.py --run
"""
import argparse, json, os, re, sys, time, unicodedata, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
RULE_FILES = ['rename-years-rules.json', 'rename-years-rules-propuse.json',
              'rename-years-rules-final.json']
PLAN_FILE = os.path.join(HERE, 'dedupe-merged-plan.json')
LOG = os.path.join(HERE, 'dedupe-merged-log.jsonl')
PREFIX = 'Navigatie PilotOn '
CFG = re.compile(r'\s+(?:2K(?:\s+QLED)?(?:\s+(?:9|10)\s+Inch)?'
                 r'|(?:7|8|9|10|9\.7|8\.8|10\.25|12\.9)\s*(?:inch|Inch)(?:\s+QLED)?)\s')


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


def split_name(name):
    if not name.startswith(PREFIX):
        return None
    rest = name[len(PREFIX):]
    if rest.startswith('Tip Tesla '):
        return None            # familiile Tesla au alt set de configuratii, nu se ating
    m = CFG.search(rest)
    if not m:
        return None
    cfg = re.sub(r'(\d+)\s*(CORE|Core|core)', r'\1C', rest[m.start():]).upper().strip()
    return rest[:m.start()], cfg


def enrich(p):
    """/api/products nu trimite purchaseCount/viewCount/createdAt — vin doar din
       documentul complet. Se cer doar pentru produsele aflate intr-un grup disputat."""
    d = json.loads(http(f"{API}/api/products/id/{p['_id']}"))
    d = d.get('product', d)
    for f in ('purchaseCount', 'viewCount', 'createdAt', 'stock'):
        p[f] = d.get(f)
    return p


def rank(p):
    """cheia de sortare — primul din grup e cel pastrat"""
    return (-(p.get('purchaseCount') or 0),
            -(p.get('imageCount') or 0),
            0 if p.get('slug') == slugify(p['name']) else 1,
            -(p.get('viewCount') or 0),
            p.get('createdAt') or '')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.plan or args.run):
        sys.exit('alege --plan sau --run')

    targets = set()
    for f in RULE_FILES:
        path = os.path.join(HERE, f)
        if os.path.exists(path):
            targets |= {new for _, new in json.load(open(path))}
    print(f'{len(targets)} familii contopite de verificat')

    live = [p for p in fetch_all() if p.get('status') == 'active']
    groups = {}
    for p in live:
        s = split_name(p['name'])
        if not s or s[0] not in targets:
            continue
        groups.setdefault((s[0], s[1], p.get('price')), []).append(p)

    contested = [ps for ps in groups.values() if len(ps) > 1]
    print(f'{sum(len(x) for x in contested)} produse in {len(contested)} grupuri disputate; '
          'se citesc vanzarile...')
    for ps in contested:
        for p in ps:
            enrich(p)

    plan = []
    for (base, cfg, price), ps in sorted(groups.items()):
        if len(ps) < 2:
            continue
        ps.sort(key=rank)
        keep = ps[0]
        for p in ps[1:]:
            plan.append({'id': p['_id'], 'name': p['name'], 'slug': p['slug'],
                         'sku': p.get('sku'), 'images': p.get('imageCount', 0),
                         'price': price, 'base': base, 'cfg': cfg,
                         'keep_slug': keep['slug'], 'keep_images': keep.get('imageCount', 0),
                         'keep_sold': keep.get('purchaseCount') or 0,
                         'sold': p.get('purchaseCount') or 0,
                         'stock': p.get('stock')})
    json.dump(plan, open(PLAN_FILE, 'w'), ensure_ascii=False, indent=1)

    models = sorted({x['base'] for x in plan})
    print(f'{len(plan)} produse de dezactivat, pe {len(models)} modele -> {PLAN_FILE}')
    last = None
    for x in plan:
        if x['base'] != last:
            print(f"\n  {x['base']}")
            last = x['base']
        print(f"    off {x['images']:2}p  {x['cfg']:26} {x['price']:>5} lei  "
              f"{x['slug']}   (ramane {x['keep_images']}p {x['keep_slug']})")
    sold = [x for x in plan if x['sold']]
    if sold:
        print(f'\n  !! {len(sold)} dintre ele au vanzari inregistrate:')
        for x in sold:
            print(f"     {x['sold']}x  {x['slug']}")
    if args.plan:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Authorization': f'Bearer {token}'}
    log('login-ok', planned=len(plan))

    ok = failed = 0
    for x in plan:
        try:
            http(f"{API}/api/products/{x['id']}", method='DELETE', headers=hdr)
            ok += 1
            log('dezactivat', id=x['id'], slug=x['slug'], sku=x['sku'],
                name=x['name'], keep=x['keep_slug'])
        except Exception as e:
            failed += 1
            log('eroare', id=x['id'], slug=x['slug'], error=str(e)[:200])
        if (ok + failed) % 50 == 0:
            print(f'  ... {ok} dezactivate, {failed} esuate')
    print(f'\nGata: {ok} dezactivate, {failed} esuate. Reversibil: PUT status=active.')


if __name__ == '__main__':
    main()

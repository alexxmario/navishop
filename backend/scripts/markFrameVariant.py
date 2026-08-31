#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Separa o rama dintr-o familie care s-a amestecat sub acelasi nume: produsele ramei
primesc un marcaj in titlu (SILVER / BLACK / GREY ...), iar configuratiile care
exista doar la cealalta rama se cloneaza sub numele marcat.

Doua liste de slug-uri, pentru ca decizia „ce e ce rama" o ia omul, nu scriptul:
  rename — produse care SUNT deja rama respectiva, li se pune doar marcajul;
  clone  — produse ale ramei CELEILALTE, din care se face o copie marcata
           (masina, configuratia si descrierea sunt bune; pozele se pun separat,
            cu copyImageSets.py --only).

Slug-ul si SKU-ul produselor redenumite NU se ating (sunt in URL-uri indexate si in
istoricul de comenzi) — aceeasi regula ca la renameYears.py. Clonele primesc slug nou
din numele marcat si SKU nou cu marcajul intercalat (…NFL… -> …NFLS…).

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/markFrameVariant.py --spec mark-golfplus-silver.json --dry-run
  python3 backend/scripts/markFrameVariant.py --spec mark-golfplus-silver.json --run
"""
import argparse, json, os, re, sys, time, unicodedata, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'mark-frame-log.jsonl')
PREFIX = 'Navigatie PilotOn '
DROP = {'_id', '__v', 'reviews', 'createdAt', 'updatedAt', 'viewCount', 'purchaseCount',
        'averageRating', 'totalReviews'}


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


def by_slug(slug):
    d = json.loads(http(f'{API}/api/products/{slug}'))
    return d.get('product', d)


def marked(name, base, marker):
    """«… Golf Plus 2005-2014 9 inch 4GB…» -> «… Golf Plus 2005-2014 SILVER 9 inch 4GB…»"""
    if not name.startswith(base):
        raise RuntimeError(f'numele nu incepe cu baza: {name}')
    return f'{base} {marker}{name[len(base):]}'


def retitle(doc, base, marker):
    """numele nou peste tot unde apare: titlu, SEO, alt-textul pozelor"""
    new_name = marked(doc['name'], base, marker)
    short, short_new = base[len(PREFIX):], f'{base[len(PREFIX):]} {marker}'
    out = {'name': new_name}
    for k in ('seoTitle', 'seoDescription'):
        v = doc.get(k)
        if isinstance(v, str) and v:
            # acopera si forma «numele produsului», si forma generata «Navigație VW … | PilotOn»
            out[k] = v.replace(doc['name'], new_name).replace(short, short_new)
    out['images'] = [{'url': im['url'], 'alt': new_name, 'isPrimary': i == 0}
                     for i, im in enumerate(doc.get('images') or [])]
    return new_name, out


def new_sku(sku, marker, taken):
    """marcajul intra unde il are si catalogul: TIGUANNFL|B|0718 -> GOLFPLUSNFL|S|0414"""
    ini = marker[0].upper()
    cand = re.sub(r'NFL', f'NFL{ini}', sku, count=1) if 'NFL' in sku else f'{sku}{ini}'
    base, i = cand, 2
    while cand in taken:
        cand, i = f'{base}{i}', i + 1
    taken.add(cand)
    return cand


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', required=True)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    spec = json.load(open(args.spec if os.path.isabs(args.spec) else os.path.join(HERE, args.spec)))
    base, marker = spec['base'], spec['marker']

    taken = set()
    page = 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        for p in d['products']:
            if p.get('sku'):
                taken.add(p['sku'])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1

    renames, clones = [], []
    for slug in spec.get('rename', []):
        doc = by_slug(slug)
        new_name, patch = retitle(doc, base, marker)
        renames.append((doc, new_name, patch))
    for slug in spec.get('clone', []):
        doc = by_slug(slug)
        new_name, patch = retitle(doc, base, marker)
        new = {k: v for k, v in doc.items() if k not in DROP}
        new.update(patch)
        new['slug'] = slugify(new_name)
        sku = new_sku(doc.get('sku') or 'PILOT', marker, taken)
        new['sku'] = sku
        ro = new.get('romanianSpecs') or {}
        if isinstance(ro.get('general'), dict):
            ro['general']['sku'] = sku
        if isinstance(ro.get('rawDetails'), dict) and ro['rawDetails'].get('SKU'):
            ro['rawDetails']['SKU'] = sku
        sd = new.get('structuredDescription')
        if isinstance(sd, dict):
            sd.pop('parsedAt', None)
            for sec in sd.get('sections') or []:
                sec.pop('_id', None)
        clones.append((doc, new))

    print(f'REDENUMIRI ({len(renames)}) — slug si SKU raman:')
    for doc, new_name, _ in renames:
        print(f'  {doc["name"]}\n    -> {new_name}')
    print(f'\nCLONE NOI ({len(clones)}) — pozele se pun separat:')
    for doc, new in clones:
        print(f'  {doc["name"]}  [{doc.get("price")} lei, sku {doc.get("sku")}]\n'
              f'    -> {new["name"]}  [{new["price"]} lei, sku {new["sku"]}]\n'
              f'       slug {new["slug"]}')
    if args.dry_run:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    log('login-ok')

    for doc, new_name, patch in renames:
        http(f'{API}/api/products/{doc["_id"]}', data=json.dumps(patch).encode(),
             method='PUT', headers=hdr)
        log('redenumit', slug=doc['slug'], nume=new_name)
    for doc, new in clones:
        try:
            http(f'{API}/api/products', data=json.dumps(new).encode(), headers=hdr)
            log('clonat', slug=new['slug'], sku=new['sku'], din=doc['slug'])
        except Exception as e:
            log('eroare', slug=new['slug'], error=str(e)[:200])
    print(f'\nGata: {len(renames)} redenumite, {len(clones)} clonate.')


if __name__ == '__main__':
    main()

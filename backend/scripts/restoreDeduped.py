#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reactiveaza produse dezactivate de dedupeMerged.py si le da un nume propriu.

dedupeMerged.py a considerat dubluri perechile cu aceeasi configuratie si acelasi
pret. Unele nu erau: erau **rame diferite**, cu seturi de poze complet distincte,
ajunse sub acelasi nume abia dupa contopirea de ani. Scriptul le aduce inapoi ca
familie separata.

Numele se reconstruieste din slug (slug-ul n-a fost atins niciodata, deci pastreaza
scrierea originala a configuratiei: `-8-core` -> "8 CORE", `-8core` -> "8CORE").

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/restoreDeduped.py --base "Renault Trafic II 2004-2014" \
      --new-base "Renault Trafic II 2010-2014" --plan
"""
import argparse, json, os, re, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
DEDUPE_PLAN = os.path.join(HERE, 'dedupe-merged-plan.json')
LOG = os.path.join(HERE, 'restore-deduped-log.jsonl')
PREFIX = 'Navigatie PilotOn '


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


def cfg_from_slug(slug, name):
    """scrierea originala a configuratiei, luata din slug

    Numele curent are CORE lipit de trucul de dezambiguizare; slug-ul nu, asa ca
    el spune daca produsul era "8 CORE" sau "8CORE"."""
    m = re.search(r'(\d+)\s*(CORE|Core|core)\b', name)
    if not m:
        return name
    joined = re.search(rf'{m.group(1)}core(?:-|$)', slug)
    spaced = re.search(rf'{m.group(1)}-core(?:-|$)', slug)
    want = f'{m.group(1)} {m.group(2)}' if spaced else (f'{m.group(1)}{m.group(2)}' if joined
                                                        else m.group(0))
    return name[:m.start()] + want + name[m.end():]


def original_names():
    """id -> numele dinainte de redenumiri, din primul rand de log al produsului"""
    out = {}
    path = os.path.join(HERE, 'rename-years-log.jsonl')
    if os.path.exists(path):
        for line in open(path):
            r = json.loads(line)
            if r.get('event') == 'redenumit' and r['id'] not in out:
                out[r['id']] = r['old']
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', help='baza sub care au fost inghesuite')
    ap.add_argument('--new-base', help='baza noua, distincta')
    ap.add_argument('--ids', help='fisier JSON cu id-uri; fiecare isi recapata numele dinainte')
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.plan or args.run):
        sys.exit('alege --plan sau --run')
    if not args.ids and not (args.base and args.new_base):
        sys.exit('da fie --ids, fie --base + --new-base')

    if args.ids:
        wanted = set(json.load(open(args.ids)))
        plan = [x for x in json.load(open(DEDUPE_PLAN)) if x['id'] in wanted]
        orig = original_names()
        todo, unchanged = [], 0
        for x in plan:
            name = orig.get(x['id'])
            if not name:
                # n-a fost redenumit niciodata: era familia care exista deja, iar
                # dedupe a pastrat-o pe cealalta. Ramane cu numele lui.
                name = cfg_from_slug(x['slug'], x['name'])
                unchanged += 1
            todo.append({**x, 'new_name': name})
        args.base = args.new_base = None
        print(f'{len(todo)} de reactivat ({unchanged} isi pastreaza numele curent)')
    else:
        plan = [x for x in json.load(open(DEDUPE_PLAN))
                if x['name'].startswith(PREFIX + args.base + ' ')]
        if not plan:
            sys.exit(f'nimic dezactivat sub {args.base!r}')
        todo = []
        for x in plan:
            name = cfg_from_slug(x['slug'], x['name'])
            todo.append({**x, 'new_name':
                         PREFIX + args.new_base + name[len(PREFIX) + len(args.base):]})

    print(f'{len(todo)} produse de reactivat sub {args.new_base!r}:')
    for x in todo:
        print(f"  {x['images']:2}p  {x['new_name'][len(PREFIX):]}")
        print(f"        slug {x['slug']}")
    if args.plan:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    log('login-ok', base=args.base, new_base=args.new_base, n=len(todo))

    ok = failed = 0
    for x in todo:
        try:
            d = json.loads(http(f"{API}/api/products/id/{x['id']}"))
            d = d.get('product', d)
            patch = {'status': 'active', 'name': x['new_name']}
            if args.base and args.new_base:
                for f in ('seoTitle', 'seoDescription'):
                    if isinstance(d.get(f), str) and args.base in d[f]:
                        patch[f] = d[f].replace(args.base, args.new_base)
            if d.get('images'):
                patch['images'] = [{'url': im['url'], 'alt': x['new_name'],
                                    'isPrimary': i == 0} for i, im in enumerate(d['images'])]
            http(f"{API}/api/products/{x['id']}", data=json.dumps(patch).encode(),
                 method='PUT', headers=hdr)
            ok += 1
            log('reactivat', id=x['id'], slug=x['slug'], name=x['new_name'])
        except Exception as e:
            failed += 1
            log('eroare', id=x['id'], slug=x['slug'], error=str(e)[:200])
            print('   !!', x['slug'], str(e)[:120])
    print(f'\nGata: {ok} reactivate, {failed} esuate.')


if __name__ == '__main__':
    main()

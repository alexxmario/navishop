#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dezactiveaza produse anume (soft-delete prin DELETE /api/products/:id).

ATENTIE: operatia nu se poate anula prin API — produsele cu status != 'active' nu se
vad pe nicio cale de citire, dar tin slug-ul si SKU-ul ocupate. De aceea scriptul
salveaza INTAI documentul intreg al fiecarui produs in backup-ul JSON; daca trebuie
readus, se re-creeaza cu POST /api/products din acel fisier (slug/SKU vor avea nevoie
de sufix, fiindca fantoma le tine ocupate).

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/deactivateProducts.py --slugs a,b,c --backup bkp.json --dry-run
  python3 backend/scripts/deactivateProducts.py --slugs a,b,c --backup bkp.json --run
"""
import argparse, json, os, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'deactivate-log.jsonl')


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={v}' for k, v in kw.items()), flush=True)


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slugs', required=True, help='slug-uri separate prin virgula')
    ap.add_argument('--backup', required=True, help='fisierul in care se salveaza documentele')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    slugs = [s for s in args.slugs.split(',') if s]
    docs = []
    for s in slugs:
        d = json.loads(http(f'{API}/api/products/{s}'))
        docs.append(d.get('product', d))

    print(f'{len(docs)} de dezactivat:')
    for d in docs:
        print(f'  - {d["name"]}  [{d.get("price")} lei, sku {d.get("sku")}, '
              f'{len(d.get("images") or [])} poze]')
    if args.dry_run:
        return

    path = args.backup if os.path.isabs(args.backup) else os.path.join(HERE, args.backup)
    json.dump(docs, open(path, 'w'), ensure_ascii=False, indent=1)
    print(f'\nbackup -> {path}')

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Authorization': f'Bearer {token}'}
    log('login-ok')

    ok = failed = 0
    for d in docs:
        try:
            http(f'{API}/api/products/{d["_id"]}', method='DELETE', headers=hdr)
            ok += 1
            log('dezactivat', slug=d['slug'], sku=d.get('sku'), backup=os.path.basename(path))
        except Exception as e:
            failed += 1
            log('eroare', slug=d['slug'], error=str(e)[:200])
    print(f'\nGata: {ok} dezactivate, {failed} esuate.')


if __name__ == '__main__':
    main()

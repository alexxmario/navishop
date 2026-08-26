#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rescrie SKU-urile familiilor Tesla create de insertTeslaFamilies.py inainte de corectia
din 26 aug: marcajul de configuratie (4 / 2Q / 6 / 2O) lipsea, fiindca anii din SKU-ul
sablonului nu coincid cu cei din numele lui, iar cele 4 configuratii ale unei familii
ajungeau sa se diferentieze doar prin sufixul numeric de deduplicare.

  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/fixTeslaSkus.py --dry-run
  python3 backend/scripts/fixTeslaSkus.py --run
"""
import argparse, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('ins', os.path.join(HERE, 'insertTeslaFamilies.py'))
ins = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ins)

API, PREFIX = ins.API, ins.PREFIX
TEMPLATE = 'Tip Tesla Opel Astra J 2009-2015'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    families = [f['base'] for f in json.load(open(os.path.join(HERE, 'tesla-new-families.json')))]
    live = ins.fetch_all()
    skus = {p.get('sku') for p in live if p.get('sku')}
    by_name = {p['name']: p for p in live}

    tpl = [p for p in live if p['name'].startswith(f'{PREFIX}{TEMPLATE} ')]
    n = len(os.path.commonprefix([p['sku'] for p in tpl]))
    suf = {ins.CFG_RE.search(p['name']).group(1): p['sku'][n:] for p in tpl}
    print('marcaje de configuratie:', suf)

    todo = []
    for base in families:
        for cfg, s in suf.items():
            name = f'{PREFIX}{base} {cfg}'
            p = by_name.get(name)
            if not p:
                print(f'  ?? lipseste {name}')
                continue
            want = ins.sku_stem(base) + s
            if p['sku'] != want:
                todo.append((p, want))

    for p, want in todo:
        skus.discard(p['sku'])
    fixed = []
    for p, want in todo:
        fixed.append((p, ins.unique(want, skus)))

    print(f'{len(fixed)} SKU-uri de corectat')
    for p, want in fixed[:8]:
        print(f'   {p["sku"]:32} -> {want:32}  {p["name"][:60]}')
    if args.dry_run:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(ins.http(f'{API}/api/auth/login',
                                data=json.dumps({'email': email, 'password': pw}).encode(),
                                headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}

    ok = bad = 0
    for p, want in fixed:
        try:
            d = json.loads(ins.http(f'{API}/api/products/id/{p["_id"]}'))
            d = d.get('product', d)
            rs = d.get('romanianSpecs') or {}
            rs.setdefault('general', {})['sku'] = want
            body = {'sku': want, 'romanianSpecs': rs,
                    'specifications': [{'key': s['key'],
                                        'value': want if s['key'] == 'MPN' else s['value']}
                                       for s in (d.get('specifications') or [])]}
            ins.http(f'{API}/api/products/{p["_id"]}', data=json.dumps(body).encode(),
                     method='PUT', headers=hdr)
            ok += 1
        except Exception as e:
            bad += 1
            print(f'  !! {p["name"]}: {str(e)[:140]}')
    print(f'\nGata: {ok} corectate, {bad} esuate.')


if __name__ == '__main__':
    main()

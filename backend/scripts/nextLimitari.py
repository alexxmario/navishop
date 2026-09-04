#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arata urmatoarele modele de citit, sortate dupa cate produse avem NOI pe ele.

  python3 backend/scripts/nextLimitari.py [N]

Sursa URL-urilor: limitari-model-urls.json (extras din sitemap-ul lor, deci
o singura cerere per model — nu mai trebuie pagina de categorie).
"""
import json, os, sys, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location('mcm', os.path.join(HERE, 'matchCarModels.py'))
mcm = importlib.util.module_from_spec(_s)
_a, sys.argv2 = sys.argv, None
import contextlib
_argv, sys.argv = sys.argv, [sys.argv[0]]
_s.loader.exec_module(mcm)
sys.argv = _argv

N = int(sys.argv[1]) if len(sys.argv) > 1 else 15
urls = json.load(open(os.path.join(HERE, 'limitari-model-urls.json'), encoding='utf-8'))
done = {r['modelLor'] for r in json.load(open(os.path.join(HERE, 'limitari-live-harvest.json'),
                                             encoding='utf-8'))['results']}
ours = json.load(open(os.path.join(HERE, 'our-car-models.json'), encoding='utf-8'))

rows = []
for slug, url in urls.items():
    key = slug[len('navigatie-'):]
    if key in done:
        continue
    car, years = mcm.parse_group_key(key)
    hit = 0
    for o in ours:
        s, _ = mcm.score(o['car'], o['years'], car, years)
        if s > 0:
            hit += o['products']
    rows.append((hit, key, url))
rows.sort(key=lambda r: -r[0])
print(f'ramase: {len(rows)} din {len(urls)} | citite: {len(done)}')
for hit, key, url in rows[:N]:
    print(f'{hit:4d}  {key}')
    print(f'      {url}')

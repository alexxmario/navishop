#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construieste our-car-models.json (masina + ani + cate produse avem) din API-ul live."""
import json, os, sys, collections, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
_s = importlib.util.spec_from_file_location('al', os.path.join(HERE, 'applyLimitari.py'))
al = importlib.util.module_from_spec(_s)
_argv, sys.argv = sys.argv, [sys.argv[0], '--plan']
_s.loader.exec_module(al)
sys.argv = _argv

MULTI = ['Alfa Romeo', 'Land Rover', 'Mercedes Benz', 'Great Wall']
def brand_of(car):
    for b in MULTI:
        if car.lower().startswith(b.lower()):
            return b
    return car.split()[0] if car.split() else ''

products = al.fetch_all_products()
groups = collections.defaultdict(list)
for p in products:
    if p.get('category') not in al.NAV_CATEGORIES:
        continue
    car, y1, y2 = al.parse_product(p.get('name'))
    if not car:
        continue
    years = f'{y1}-{y2}' if y2 and y2 < 2099 else f'dupa {y1}'
    groups[(car, years)].append(p)

out = [{'car': c, 'years': y, 'brand': brand_of(c), 'products': len(v)}
       for (c, y), v in sorted(groups.items())]
json.dump(out, open(os.path.join(HERE, 'our-car-models.json'), 'w'), ensure_ascii=False, indent=1)
print(f'Produse active: {len(products)} | grupuri masina+ani: {len(out)} | '
      f'produse-navigatie: {sum(x["products"] for x in out)}')

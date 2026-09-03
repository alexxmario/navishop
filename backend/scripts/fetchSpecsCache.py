#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aduce romanianSpecs.hardware pentru fiecare produs din price-check-products-cache.json.

Lista /api/products nu mai întoarce specs (proiecția LIST_PROJECT din
routes/products.js le taie), așa că singura sursă e /api/products/:slug.
Rezultatul se scrie incremental în price-check-specs-cache.json — rularea e
reluabilă: sluguri deja prezente nu se mai cer.
"""

import json
import os
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
PRODUCTS = os.path.join(HERE, 'price-check-products-cache.json')
SPECS = os.path.join(HERE, 'price-check-specs-cache.json')

lock = threading.Lock()
done = 0


def fetch(slug):
    for i in range(4):
        try:
            with urllib.request.urlopen(f'{API}/api/products/{slug}', timeout=60) as r:
                d = json.loads(r.read())
            p = d.get('product') or d
            rs = p.get('romanianSpecs') or {}
            return slug, {'hardware': rs.get('hardware'), 'price': p.get('price'),
                          'sku': p.get('sku')}
        except Exception:
            time.sleep(1.5 * (i + 1))
    return slug, None


def main():
    products = json.load(open(PRODUCTS))
    cache = json.load(open(SPECS)) if os.path.exists(SPECS) else {}
    todo = [p['slug'] for p in products if p.get('slug') and p['slug'] not in cache]
    print(f'{len(products)} produse, {len(cache)} în cache, {len(todo)} de adus')
    global done
    with ThreadPoolExecutor(max_workers=12) as ex:
        for slug, data in ex.map(fetch, todo):
            with lock:
                cache[slug] = data
                done += 1
                if done % 250 == 0:
                    json.dump(cache, open(SPECS, 'w'), ensure_ascii=False)
                    print(f'  {done}/{len(todo)}', flush=True)
    json.dump(cache, open(SPECS, 'w'), ensure_ascii=False)
    failed = [s for s, v in cache.items() if v is None]
    print(f'gata: {len(cache)} în cache, {len(failed)} eșuate')
    if failed:
        print('  ex:', failed[:5])


if __name__ == '__main__':
    main()

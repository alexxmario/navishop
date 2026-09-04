#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verifică pozele din familiile canonice de 9 (rame de 9" și 10").

Regula lui Alex (4 sep 2026): pozele arată interfața, iar interfața diferă
**după procesor**, nu după numărul de nuclee. Deci setul de 9 are patru grupe
de poze, fiecare cu un produs-sursă:

  RK 3326 1.5 GHz    2GB 32GB 4 CORE  (sursă)  →  4GB 64GB 4 CORE
  XT8581 1.6 GHz     6GB 128GB 8 CORE (sursă)  →  4GB 64GB 8 CORE
  8667 2.0 GHz       8GB 256GB 8 CORE (sursă)  →  4GB 64GB 8CORE
  2K 8667 2.0 GHz    cele trei 2K împreună

Asta corectează gruparea din august, care punea toate cele patru 8-core
într-o singură grupă de poze (vezi memoria piloton-normalizare-familii).

Doar citește și raportează → family-images-report.json + family-images-plan.json

    python3 checkFamilyImages.py [--cached]
"""

import argparse
import json
import os
import re
import threading
import time
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import checkPricesRama as cr
import checkPrices as cp

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LIST_CACHE = os.path.join(HERE, 'family-images-list-cache.json')
FULL_CACHE = os.path.join(HERE, 'family-images-full-cache.json')
REPORT = os.path.join(HERE, 'family-images-report.json')
PLAN = os.path.join(HERE, 'family-images-plan.json')

# grupă -> (configurația sursă, configurațiile care trebuie să o urmeze)
PHOTO_GROUPS = {
    'RK 3326 1.5':   ('2GB 32GB 4 CORE', ['4GB 64GB 4 CORE']),
    'XT8581 1.6':    ('6GB 128GB 8 CORE', ['4GB 64GB 8 CORE']),
    '8667 2.0':      ('8GB 256GB 8 CORE', ['4GB 64GB 8CORE']),
    '2K 8667 2.0':   (None, ['2K 4GB 64GB 8 CORE', '2K 8GB 256GB 8 CORE',
                             '2K 12GB 256GB 8 CORE']),
}

SKU_SUFFIXES = ['4GBOPO2', '12GB2KPO', '4GB2KPO', '8GB2KPO',
                '2GBQPO', '4GBQPO', '4GBOPO', '6GBOPO', '8GBOPO']

lock = threading.Lock()


def sku_prefix(sku):
    for s in SKU_SUFFIXES:
        if sku and sku.endswith(s):
            return sku[:-len(s)]
    return None


def http_json(url, tries=4):
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return json.loads(r.read())
        except Exception as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f'GET {url}: {last}')


def fetch_list(use_cache):
    if use_cache and os.path.exists(LIST_CACHE):
        return json.load(open(LIST_CACHE))
    out, page = [], 1
    while True:
        d = http_json(f'{API}/api/products?category=navigatii-gps&limit=1000'
                      f'&page={page}&sortBy=_id&sortOrder=asc')
        out.extend(d.get('products', []))
        print(f'  pagina {page}/{d["pagination"].get("totalPages")} — {len(out)}', flush=True)
        if not d['pagination'].get('hasNextPage'):
            break
        page += 1
    json.dump(out, open(LIST_CACHE, 'w'), ensure_ascii=False)
    return out


def fetch_full(slugs, use_cache):
    cache = json.load(open(FULL_CACHE)) if (use_cache and os.path.exists(FULL_CACHE)) else {}
    todo = [s for s in slugs if s not in cache]
    print(f'{len(slugs)} produse în familii, {len(todo)} de adus întregi')
    done = [0]

    def one(slug):
        d = http_json(f'{API}/api/products/{slug}')
        p = d.get('product') or d
        return slug, {'_id': p.get('_id'), 'name': p.get('name'),
                      'images': [{'url': i.get('url'), 'alt': i.get('alt'),
                                  'isPrimary': i.get('isPrimary')}
                                 for i in (p.get('images') or [])]}

    if todo:
        with ThreadPoolExecutor(max_workers=12) as ex:
            for slug, data in ex.map(one, todo):
                with lock:
                    cache[slug] = data
                    done[0] += 1
                    if done[0] % 500 == 0:
                        json.dump(cache, open(FULL_CACHE, 'w'), ensure_ascii=False)
                        print(f'  {done[0]}/{len(todo)}', flush=True)
        json.dump(cache, open(FULL_CACHE, 'w'), ensure_ascii=False)
    return cache


def build_families(products):
    """Aceeași grupare ca rubrica Prețuri din admin-panel: pagină × diagonală,
    spartă pe prefixul de SKU doar când o configurație apare de mai multe ori."""
    groups = defaultdict(lambda: {'items': []})
    for p in products:
        name = p.get('name') or ''
        if not re.match(r'Navigatie PilotOn\b', name, re.I):
            continue
        key, inch = cr.config_of(name)
        if key is None:
            continue
        model = cp.model_part(name)
        size = 10 if inch in ('10', '10.1') else (9 if inch == '9' else None)
        g = groups[(model, size)]
        g['model'], g['size'] = model, size
        g['items'].append({**p, 'config': key})

    # 2K fără diagonală în titlu → la rama lor, după prefixul de SKU
    sized = defaultdict(list)
    for (model, size), g in groups.items():
        if size is not None:
            sized[model].append(g)
    for (model, size) in list(groups):
        if size is not None:
            continue
        g = groups[(model, size)]
        cands = sized.get(model, [])
        if not cands:
            continue
        left = []
        for it in g['items']:
            pref = sku_prefix(it.get('sku'))
            target = None
            best = -1
            if pref:
                for c in cands:
                    for sib in c['items']:
                        sp = sku_prefix(sib.get('sku'))
                        if not sp:
                            continue
                        if (sp == pref or sp.startswith(pref) or pref.startswith(sp)) \
                                and min(len(sp), len(pref)) > best:
                            best, target = min(len(sp), len(pref)), c
            if target is None and len(cands) == 1:
                target = cands[0]
            (target['items'] if target is not None else left).append(it)
        if left:
            g['items'] = left
        else:
            del groups[(model, size)]

    fams = []
    for g in groups.values():
        per = defaultdict(int)
        for it in g['items']:
            per[it['config']] += 1
        if max(per.values()) <= 1:
            fams.append(g)
            continue
        clusters = defaultdict(list)
        for it in g['items']:
            clusters[sku_prefix(it.get('sku')) or '—'].append(it)
        if len(clusters) < 2:
            fams.append(g)
        else:
            fams.extend({'model': g['model'], 'size': g['size'], 'items': v}
                        for v in clusters.values())
    return fams


def urls(entry):
    return [i['url'] for i in (entry or {}).get('images', [])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cached', action='store_true')
    args = ap.parse_args()

    print('Aduc lista de produse…')
    products = fetch_list(args.cached)
    fams = build_families(products)
    print(f'{len(fams)} familii')

    slugs = [it['slug'] for f in fams for it in f['items']]
    full = fetch_full(slugs, args.cached)

    plan, ok_groups, problems, missing_source = [], 0, [], []
    per_group_stats = defaultdict(lambda: {'ok': 0, 'de_copiat': 0, 'fara_sursa': 0})

    for f in fams:
        by_config = {}
        for it in f['items']:
            by_config.setdefault(it['config'], it)
        label = f'{f["model"]} ({f["size"]}")' if f['size'] else f['model']

        for gname, (source_cfg, targets) in PHOTO_GROUPS.items():
            members = [c for c in ([source_cfg] if source_cfg else []) + targets
                       if c in by_config]
            if len(members) < 2:
                continue

            if source_cfg and source_cfg in by_config:
                src_cfg = source_cfg
            else:
                # 2K, sau grupă fără sursa canonică: cel cu cele mai multe poze
                src_cfg = max(members, key=lambda c: len(urls(full.get(by_config[c]['slug']))))
            src = by_config[src_cfg]
            src_urls = urls(full.get(src['slug']))

            if len(src_urls) < 5:
                missing_source.append({'familie': label, 'grupa': gname,
                                       'sursa': src['name'], 'poze': len(src_urls)})
                per_group_stats[gname]['fara_sursa'] += 1
                continue

            diffs = []
            for cfg in members:
                if cfg == src_cfg:
                    continue
                tgt = by_config[cfg]
                tgt_urls = urls(full.get(tgt['slug']))
                if tgt_urls == src_urls:
                    continue
                diffs.append({'slug': tgt['slug'], 'name': tgt['name'], 'config': cfg,
                              'acum': len(tgt_urls), 'devine': len(src_urls)})

            if not diffs:
                ok_groups += 1
                per_group_stats[gname]['ok'] += 1
                continue

            per_group_stats[gname]['de_copiat'] += len(diffs)
            plan.append({'familie': label, 'grupa': gname,
                         'sursa': {'slug': src['slug'], 'name': src['name'],
                                   'config': src_cfg, 'poze': len(src_urls)},
                         'tinte': diffs})
            problems.append(label)

    report = {
        'generat': time.strftime('%Y-%m-%d %H:%M:%S'),
        'regula': {k: {'sursa': v[0], 'primesc': v[1]} for k, v in PHOTO_GROUPS.items()},
        'sumar': {
            'familii': len(fams),
            'grupe_corecte': ok_groups,
            'grupe_de_reparat': len(plan),
            'produse_de_actualizat': sum(len(p['tinte']) for p in plan),
            'familii_atinse': len(set(problems)),
            'grupe_fara_sursa_utila': len(missing_source),
        },
        'pe_grupa': dict(per_group_stats),
        'de_reparat': plan,
        'fara_sursa_utila': missing_source,
    }
    json.dump(report, open(REPORT, 'w'), ensure_ascii=False, indent=1)
    json.dump({'generat': report['generat'], 'items': plan}, open(PLAN, 'w'),
              ensure_ascii=False, indent=1)

    print('\n================ SUMAR ================')
    for k, v in report['sumar'].items():
        print(f'  {k}: {v}')
    print('\nPe grupă de poze:')
    for g, s in per_group_stats.items():
        print(f'  {g:16s} corecte={s["ok"]:4d}  de copiat={s["de_copiat"]:4d}  '
              f'fara sursa={s["fara_sursa"]:3d}')
    print(f'\nRaport: {REPORT}\nPlan:   {PLAN}')


if __name__ == '__main__':
    main()

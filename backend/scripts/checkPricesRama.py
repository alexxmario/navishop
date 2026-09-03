#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verifică prețurile setului canonic de 9 configurații pe ramă (9" și 10")
față de lista de rame LISTA APARATE +RAME ACTUALIZATA 08.2026.numbers.

Grila (confirmată de Alex, 3 sep 2026) — treapta o dă prețul ramei:
  <100 / 100-200 inclusiv / >200

  2GB 32GB 4 CORE          849  899  949
  4GB 64GB 4 CORE          999 1049 1099
  4GB 64GB 8 CORE  (1.6)  1399 1449 1499
  4GB 64GB 8CORE   (2.0)  1599 1649 1699
  6GB 128GB 8 CORE        1599 1649 1699
  8GB 256GB 8 CORE        2299 2349 2399
  2K 4GB 64GB 8 CORE      1999 2049 2099
  2K 8GB 256GB 8 CORE     2799 2849 2899
  2K 12GB 256GB 8 CORE    3299 fix

Cele două 4GB/64GB 8 core se deosebesc în nume prin „8 CORE" (cu spațiu, XT8581
la 1,6 GHz) și „8CORE" (lipit, 8667 la 2,0 GHz) — vezi foaia APARATE PILOTON.

Doar citește și raportează. Ieșire: price-rama-report.json + price-rama-plan.json.

    python3 checkPricesRama.py [--numbers <fisier>] [--refresh]
"""

import argparse
import json
import os
import re
import time
from collections import defaultdict

import checkPrices as cp

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_NUMBERS = os.path.expanduser(
    '~/Downloads/LISTA APARATE +RAME ACTUALIZATA 08.2026.numbers')
PRODUCTS = os.path.join(HERE, 'price-check-products-cache.json')
SPECS = os.path.join(HERE, 'price-check-specs-cache.json')
REPORT = os.path.join(HERE, 'price-rama-report.json')
PLAN = os.path.join(HERE, 'price-rama-plan.json')

SKIP_SHEETS = {'Rezumat exportare', 'APARATE PILOTON', 'APARATE JUNSUN ',
               'ADAPTOARE 2DIN VW, SKODA , SEAT ', 'Foaia 1'}

# config -> (grilă pe trepte) sau ('fix', preț)
GRID = {
    '2GB 32GB 4 CORE':      (849, 899, 949),
    '4GB 64GB 4 CORE':      (999, 1049, 1099),
    '4GB 64GB 8 CORE':      (1399, 1449, 1499),
    '4GB 64GB 8CORE':       (1599, 1649, 1699),
    '6GB 128GB 8 CORE':     (1599, 1649, 1699),
    '8GB 256GB 8 CORE':     (2299, 2349, 2399),
    '2K 4GB 64GB 8 CORE':   (1999, 2049, 2099),
    '2K 8GB 256GB 8 CORE':  (2799, 2849, 2899),
    '2K 12GB 256GB 8 CORE': (3299, 3299, 3299),
}
CONFIG_ORDER = list(GRID)

# specificațiile corecte pe configurație (foaia APARATE PILOTON)
EXPECTED_SPECS = {
    '2GB 32GB 4 CORE':      ('RK 3326', '1.5 Ghz'),
    '4GB 64GB 4 CORE':      ('RK 3326', '1.5 Ghz'),
    '4GB 64GB 8 CORE':      ('Octa Core', '1.6 Ghz'),
    '4GB 64GB 8CORE':       ('Octa Core 8667 MTK', '2.0 Ghz'),
    '6GB 128GB 8 CORE':     ('Octa Core', '1.6 Ghz'),
    '8GB 256GB 8 CORE':     ('Octa Core 8667 MTK', '2.0 Ghz'),
    '2K 4GB 64GB 8 CORE':   ('Octa Core 8667 MTK', '2.0 Ghz'),
    '2K 8GB 256GB 8 CORE':  ('Octa Core 8667 MTK', '2.0 Ghz'),
    '2K 12GB 256GB 8 CORE': ('Octa Core 8667 MTK', '2.0 Ghz'),
}

# ce NU intră în setul canonic pe ramă
OEM_RE = re.compile(r'\b(CIC|CCC|NBT|EVO|NOS|NJS|NSJ|NTG|MMI\s*[23]?G?|RMC|MHI2|HN\+?R)\b', re.I)
QLED_RE = re.compile(r'\bQLED\b', re.I)
TESLA_RE = re.compile(r'\btesla\b', re.I)
INCH_RE = re.compile(r'(\d+(?:\.\d+)?)\s*inch\b', re.I)


def read_numbers(path, warnings):
    """Aceleași rânduri ca cp.parse_excel, dar dintr-un fișier .numbers."""
    from numbers_parser import Document
    doc = Document(path)
    rows = []
    for sheet in doc.sheets:
        if sheet.name in SKIP_SHEETS or sheet.name.strip() in {s.strip() for s in SKIP_SHEETS}:
            continue
        for table in sheet.tables:
            grid = table.rows(values_only=True)
            blocks = []
            for ri, row in enumerate(grid):
                for ci in range(len(row) - 2):
                    a = str(row[ci] or '').strip().upper()
                    b = str(row[ci + 1] or '').strip().upper()
                    c = str(row[ci + 2] or '').strip().upper()
                    if a == 'MODEL' and b == 'SIZE' and c == 'PRICE':
                        blocks.append((ri, ci))
            if not blocks:
                blocks = [(-1, 0)]
            for (hri, ci) in blocks:
                for row in grid[hri + 1:]:
                    if ci + 2 >= len(row):
                        continue
                    model, size, price = row[ci], row[ci + 1], row[ci + 2]
                    if model is None and price is None:
                        continue
                    if not isinstance(price, (int, float)) or not model:
                        if model or price:
                            warnings.append(
                                f'Foaia "{sheet.name}": rând ignorat: {model!r} / {size!r} / {price!r}')
                        continue
                    raw = re.sub(r'\s+', ' ', str(model)).strip()
                    rows.append({'sheet': sheet.name, 'raw': raw,
                                 'size': int(size) if size else None,
                                 'rama': float(price)})
    dupes = defaultdict(set)
    for r in rows:
        dupes[(r['raw'].upper(), r['size'])].add(r['rama'])
    for (raw, size), prices in dupes.items():
        if len(prices) > 1:
            warnings.append(f'Lista: "{raw}" (size {size}) apare cu rame diferite: {sorted(prices)}')
    return rows


# sufixul de SKU -> configurație. E mai sigur decât numele: cele două 4GB+64GB
# 8 core se scriu „4GBOPO" (1,6 GHz) și „4GBOPO2" (2,0 GHz), pe când în nume
# diferența e doar spațiul din „8 CORE"/„8CORE", scris inconsecvent.
SKU_SUFFIX = [
    ('4GBOPO2',  '4GB 64GB 8CORE'),
    ('12GB2KPO', '2K 12GB 256GB 8 CORE'),
    ('4GB2KPO',  '2K 4GB 64GB 8 CORE'),
    ('8GB2KPO',  '2K 8GB 256GB 8 CORE'),
    ('2GBQPO',   '2GB 32GB 4 CORE'),
    ('4GBQPO',   '4GB 64GB 4 CORE'),
    ('4GBOPO',   '4GB 64GB 8 CORE'),
    ('6GBOPO',   '6GB 128GB 8 CORE'),
    ('8GBOPO',   '8GB 256GB 8 CORE'),
]


def config_from_sku(sku):
    for suf, cfg in SKU_SUFFIX:
        if sku.endswith(suf):
            return cfg
    return None


def config_of(name):
    """Returnează configurația canonică sau (None, motiv)."""
    if TESLA_RE.search(name):
        return None, 'Tesla'
    if QLED_RE.search(name):
        return None, 'QLED (stoc vechi)'
    if re.search(r'\b4G\b', name):
        return None, '„4G" (stoc vechi)'
    if OEM_RE.search(name):
        return None, 'ecran OEM'
    if re.search(r'\b3K\b', name, re.I):
        return None, '3K'

    is2k = bool(re.search(r'\b2K\b', name, re.I))
    im = INCH_RE.search(name)
    inch = im.group(1) if im else None
    if inch is not None and inch not in ('9', '10', '10.1'):
        return None, f'{inch} inch'

    m = re.search(r'(\d+)\s*GB\s+(\d+)\s*GB\s+(8\s?CORE|4\s*CORE|OCTA\s*CORE|QUAD\s*CORE)',
                  name, re.I)
    if not m:
        return None, 'fără RAM/ROM/nr. de nuclee în nume'
    ram, rom, cores = m.group(1), m.group(2), re.sub(r'\s+', ' ', m.group(3)).upper()

    if cores in ('4 CORE', '4CORE', 'QUAD CORE'):
        core_key = '4 CORE'
    elif cores == '8 CORE':
        core_key = '8 CORE'     # cu spațiu
    elif cores == '8CORE':
        core_key = '8CORE'      # lipit
    elif cores == 'OCTA CORE':
        return None, 'nume cu „Octa Core" (stoc vechi)'
    else:
        return None, f'nuclee necunoscute ({cores})'

    key = f'{ram}GB {rom}GB {core_key}'
    # Spațiul din „8 CORE" separă cele două variante DOAR la 4GB+64GB (1,6 vs 2,0
    # GHz). La celelalte configurații „8CORE" lipit e doar o scriere alternativă.
    if (ram, rom) != ('4', '64') or is2k:
        key = key.replace('8CORE', '8 CORE')
    if is2k:
        key = '2K ' + key
    if key not in GRID:
        return None, f'configurație în afara setului ({key})'
    return key, inch


def read_list(path, warnings):
    """Citește lista de rame din .numbers sau .xlsx."""
    if path.lower().endswith('.numbers'):
        return read_numbers(path, warnings)
    return cp.parse_excel(path, warnings)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--numbers', default=DEFAULT_NUMBERS,
                    help='lista de rame (.numbers sau .xlsx)')
    ap.add_argument('--report', default=REPORT)
    ap.add_argument('--plan', default=PLAN)
    args = ap.parse_args()
    report_path, plan_path = args.report, args.plan

    warnings = []
    print(f'Citesc lista de rame: {args.numbers}')
    rows = read_list(args.numbers, warnings)
    entries = [cp.ExcelEntry(r) for r in rows]
    by_brand = defaultdict(list)
    for e in entries:
        for b in e.brands:
            by_brand[b].append(e)
    print(f'  {len(entries)} rânduri de ramă în {len(by_brand)} mărci')

    products = json.load(open(PRODUCTS))
    specs = json.load(open(SPECS))
    print(f'  {len(products)} produse în cache')

    in_scope = [p for p in products
                if p.get('category') == 'navigatii-gps'
                and re.match(r'Navigatie PilotOn\b', p.get('name') or '', re.I)]

    # ---- grupare pe pagină de model, apoi pe ramă (diagonala din nume)
    fams = defaultdict(list)
    skipped = []
    sku_override = []
    for p in in_scope:
        key, info = config_of(p['name'])
        if key is None:
            skipped.append({'slug': p['slug'], 'name': p['name'], 'price': p['price'],
                            'reason': info})
            continue
        sku = (specs.get(p['slug']) or {}).get('sku') or ''
        from_sku = config_from_sku(sku)
        if from_sku and from_sku != key:
            # Numele e sursa de adevăr (Alex, 3 sep) — SKU-ul rămâne doar semnal
            # de verificare, nu suprascrie configurația.
            sku_override.append({'slug': p['slug'], 'name': p['name'], 'sku': sku,
                                 'din_nume': key, 'din_sku': from_sku})
        fams[cp.model_part(p['name'])].append((p, key, info))

    plan, ok, unmatched, spec_fix, ambiguous = [], [], [], [], []
    all_expected = {}
    match_cache = {}

    # Pagini cu mai multe rame: aceeași configurație apare de mai multe ori.
    # Nu e o eroare (Alex, 3 sep) — un model poate avea mai multe rame, fiecare
    # cu setul ei de 9. Contează doar dacă ramele cad pe trepte diferite.
    multi_rama = []
    for model, items in sorted(fams.items()):
        counts = defaultdict(int)
        for _, key, inch in items:
            counts[(key, inch)] += 1
        n = max(counts.values()) if counts else 0
        if n > 1:
            multi_rama.append({'model': model, 'rame': n, 'produse': len(items)})

    # Specificațiile se verifică pentru TOT setul canonic, independent de ramă:
    # un produs fără rând în listă nu primește preț nou, dar specs tot trebuie
    # să fie corecte.
    for model, items in sorted(fams.items()):
        for p, key, _ in items:
            hw = (specs.get(p['slug']) or {}).get('hardware') or {}
            want_proc, want_freq = EXPECTED_SPECS[key]
            got_proc = (hw.get('modelProcesor') or '').strip()
            got_freq = (hw.get('frecventa') or '').strip()
            if got_freq.replace('GHz', 'Ghz') != want_freq or got_proc != want_proc:
                spec_fix.append({'slug': p['slug'], 'name': p['name'], 'config': key,
                                 'frecventa': got_freq or None, 'expected_frecventa': want_freq,
                                 'modelProcesor': got_proc or None,
                                 'expected_modelProcesor': want_proc})

    for model, items in sorted(fams.items()):
        inches = {inch for _, _, inch in items if inch}
        if not inches:
            inches = {'9'}
            warnings.append(f'{model}: nicio diagonală în nume — presupus 9"')
        sizes = {10 if i in ('10', '10.1') else 9 for i in inches}
        for p, key, inch in items:
            if inch:
                size = 10 if inch in ('10', '10.1') else 9
            elif len(sizes) == 1:
                size = next(iter(sizes))
            else:
                ambiguous.append({'slug': p['slug'], 'name': p['name'], 'price': p['price'],
                                  'config': key,
                                  'reason': f'pagina are rame de {sorted(sizes)} și numele n-are diagonală'})
                continue

            ck = (model, size)
            if ck not in match_cache:
                match_cache[ck] = cp.match_model(model, size, by_brand)
            entry, note = match_cache[ck]
            if entry is None:
                unmatched.append({'slug': p['slug'], 'name': p['name'], 'price': p['price'],
                                  'config': key, 'model': model, 'size': size, 'reason': note})
                continue

            expected = GRID[key][cp.rama_tier(entry.rama)]
            rec = {'slug': p['slug'], 'name': p['name'], 'config': key,
                   'price': p['price'], 'expected': expected,
                   'diff': round((p['price'] or 0) - expected, 2),
                   'rama': entry.rama, 'size': size, 'excel': entry.label()}
            if note:
                rec['note'] = note
            if p['price'] == expected:
                ok.append(rec)
            else:
                plan.append(rec)
            all_expected[p['slug']] = rec

    report = {
        'generated': time.strftime('%Y-%m-%d %H:%M:%S'),
        'sursa_rame': args.numbers,
        'summary': {
            'produse_piloton': len(in_scope),
            'in_setul_canonic': sum(len(v) for v in fams.values()),
            'in_afara_setului': len(skipped),
            'pagini_de_model': len(fams),
            'pret_corect': len(ok),
            'de_modificat': len(plan),
            'fara_rama_in_lista': len(unmatched),
            'ambigue': len(ambiguous),
            'specs_gresite': len(spec_fix),
            'nume_vs_sku_diferite': len(sku_override),
            'pagini_cu_rame_multiple': len(multi_rama),
        },
        'de_modificat': sorted(plan, key=lambda x: (x['config'], x['name'])),
        'fara_rama_in_lista': sorted(unmatched, key=lambda x: x['name']),
        'ambigue': ambiguous,
        'specs_gresite': sorted(spec_fix, key=lambda x: (x['config'], x['name'])),
        'in_afara_setului': sorted(skipped, key=lambda x: (x['reason'], x['name'])),
        'warnings': warnings,
        'nume_vs_sku_diferite': sku_override,
        'pagini_cu_rame_multiple': multi_rama,
        'toate': all_expected,
    }
    json.dump(report, open(report_path, 'w'), ensure_ascii=False, indent=1)
    json.dump({'generated': report['generated'], 'items': report['de_modificat']},
              open(plan_path, 'w'), ensure_ascii=False, indent=1)

    print('\n================ SUMAR ================')
    for k, v in report['summary'].items():
        print(f'  {k}: {v}')

    print('\nDe modificat, pe configurație:')
    byc = defaultdict(list)
    for r in plan:
        byc[r['config']].append(r['diff'])
    for c in CONFIG_ORDER:
        if c in byc:
            d = byc[c]
            print(f'  {c:24s} {len(d):5d}  (dif. medie {sum(d)/len(d):+.0f} lei)')

    print('\nFără ramă în listă, pe configurație:')
    byu = defaultdict(int)
    for r in unmatched:
        byu[r['config']] += 1
    for c in CONFIG_ORDER:
        if c in byu:
            print(f'  {c:24s} {byu[c]:5d}')

    print('\nÎn afara setului canonic:')
    bys = defaultdict(int)
    for r in skipped:
        bys[r['reason']] += 1
    for r, n in sorted(bys.items(), key=lambda x: -x[1]):
        print(f'  {r:40s} {n:5d}')

    print(f'\nRaport: {report_path}\nPlan:   {plan_path}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aplică pe producție prețurile și specificațiile din price-rama-report.json.

Grupurile (vezi checkPricesRama.py pentru cum sunt calculate):
  A  8GB 256GB non-2K: 2849 -> 2299/2349/2399 (regula dată de Alex, 3 sep 2026)
  B  diferențe de ±50/±100 care existau și în iulie — lista nouă nu le-a schimbat
  C  diferențe de ±50/±100 apărute din lista 08.2026
  D  erori evidente de preț (|dif| >= 200)
  E  pagini fără rând în lista 08.2026, dar care aveau unul în 11.2025
  S  specificații: modelProcesor + frecventa greșite

Utilizare:
    python3 applyPricesRama.py --plan --groups A,D,S
    PILOTON_EMAIL=... PILOTON_PASSWORD=... python3 applyPricesRama.py --run --groups A,D,S

Reluabil: progresul în price-rama-apply-state.json, jurnal în price-rama-apply-log.jsonl.
Fiecare produs atins primește o intrare cu valoarea veche, ca să se poată da înapoi.
"""

import argparse
import json
import os
import sys
import time

from applyPrices import api_login, get_product, http, API

HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(HERE, 'price-rama-report.json')
REPORT_OLD = os.path.join(HERE, 'price-rama-report-OLD.json')
REPORT_NOI = os.path.join(HERE, 'price-rama-report-NOI.json')
PLAN = os.path.join(HERE, 'price-rama-apply-plan.json')
STATE = os.path.join(HERE, 'price-rama-apply-state.json')
LOG = os.path.join(HERE, 'price-rama-apply-log.jsonl')

# excluse manual (decizia lui Alex, 3 sep 2026)
EXCLUDE_SLUGS = {
    # produs singular, lângă o ramă digitală de 5590 — nu e din setul canonic
    'navigatie-piloton-porsche-cayenne-2010-2017',
}


def jlog(**kw):
    kw['ts'] = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG, 'a') as f:
        f.write(json.dumps(kw, ensure_ascii=False) + '\n')


def put_product(token, pid, payload):
    body = json.dumps(payload).encode()
    return json.loads(http(f'{API}/api/products/{pid}', data=body, method='PUT', headers={
        'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}))


def build_plan(groups):
    report = json.load(open(REPORT))
    old = json.load(open(REPORT_OLD))['toate'] if os.path.exists(REPORT_OLD) else {}

    items = []
    for x in report['de_modificat']:
        if x['slug'] in EXCLUDE_SLUGS:
            continue
        if x['config'] == '8GB 256GB 8 CORE':
            g = 'A'
        elif abs(x['diff']) in (50, 100):
            o = old.get(x['slug'])
            g = 'B' if (o and o['expected'] == x['expected']) else 'C'
        else:
            g = 'D'
        if g in groups:
            items.append({'kind': 'price', 'group': g, 'slug': x['slug'], 'name': x['name'],
                          'config': x['config'], 'old': x['price'], 'new': x['expected']})

    if 'E' in groups:
        # Paginile fără rând în lista 08.2026, dar care aveau unul în 11.2025
        # (completată de Alex în iulie). Decizia lui Alex, 3 sep: se aplică.
        noi = json.load(open(REPORT_NOI))['toate']
        report_new = json.load(open(REPORT))
        for x in report_new['fara_rama_in_lista']:
            o = noi.get(x['slug'])
            if not o or o['price'] == o['expected'] or x['slug'] in EXCLUDE_SLUGS:
                continue
            items.append({'kind': 'price', 'group': 'E', 'slug': x['slug'], 'name': x['name'],
                          'config': o['config'], 'old': o['price'], 'new': o['expected'],
                          'rama': o['rama'], 'sursa': o['excel']})

    if 'S' in groups:
        for x in report['specs_gresite']:
            if x['slug'] in EXCLUDE_SLUGS:
                continue
            items.append({'kind': 'specs', 'group': 'S', 'slug': x['slug'], 'name': x['name'],
                          'config': x['config'],
                          'old': {'modelProcesor': x['modelProcesor'], 'frecventa': x['frecventa']},
                          'new': {'modelProcesor': x['expected_modelProcesor'],
                                  'frecventa': x['expected_frecventa']}})
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--groups', default='A,D',
                    help='grupuri de aplicat, ex. A,C,D,S')
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--run', action='store_true')
    ap.add_argument('--limit', type=int, help='aplică doar primele N (test)')
    args = ap.parse_args()
    groups = {g.strip().upper() for g in args.groups.split(',') if g.strip()}

    items = build_plan(groups)
    if args.limit:
        items = items[:args.limit]
    json.dump({'generated': time.strftime('%Y-%m-%d %H:%M:%S'), 'groups': sorted(groups),
               'items': items}, open(PLAN, 'w'), ensure_ascii=False, indent=1)

    by_group = {}
    for it in items:
        by_group.setdefault((it['group'], it['kind']), 0)
        by_group[(it['group'], it['kind'])] += 1
    print(f'Plan: {len(items)} modificări  (grupuri {",".join(sorted(groups))})')
    for (g, k), n in sorted(by_group.items()):
        print(f'  {g}  {k:6s}  {n}')
    print(f'  scris în {PLAN}')

    if not args.run:
        print('\n(--plan: nu s-a scris nimic pe producție)')
        return

    state = json.load(open(STATE)) if os.path.exists(STATE) else {}
    token = api_login()
    print(f'\nAutentificat. De aplicat: {len([i for i in items if state.get(i["slug"]+":"+i["kind"]) != "ok"])}')

    done = failed = 0
    for i, it in enumerate(items, 1):
        key = it['slug'] + ':' + it['kind']
        if state.get(key) == 'ok':
            continue
        try:
            p = get_product(it['slug'])
            pid = p.get('_id') or p.get('id')
            if it['kind'] == 'price':
                if p.get('price') != it['old']:
                    jlog(action='skip', slug=it['slug'], reason='pretul s-a schimbat intre timp',
                         asteptat=it['old'], gasit=p.get('price'))
                    state[key] = 'skip'
                    continue
                put_product(token, pid, {'price': it['new']})
            else:
                rs = p.get('romanianSpecs') or {}
                hw = dict(rs.get('hardware') or {})
                hw['modelProcesor'] = it['new']['modelProcesor']
                hw['frecventa'] = it['new']['frecventa']
                rs = dict(rs)
                rs['hardware'] = hw
                put_product(token, pid, {'romanianSpecs': rs})
            jlog(action='apply', kind=it['kind'], group=it['group'], slug=it['slug'],
                 name=it['name'], old=it['old'], new=it['new'])
            state[key] = 'ok'
            done += 1
        except Exception as e:
            jlog(action='error', kind=it['kind'], slug=it['slug'], error=str(e))
            state[key] = 'error'
            failed += 1
        if i % 25 == 0:
            json.dump(state, open(STATE, 'w'))
            print(f'  {i}/{len(items)}  aplicate={done} erori={failed}', flush=True)

    json.dump(state, open(STATE, 'w'))
    print(f'\nGata: {done} aplicate, {failed} erori. Jurnal: {LOG}')


if __name__ == '__main__':
    main()

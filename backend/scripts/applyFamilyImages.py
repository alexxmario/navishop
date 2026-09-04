#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aplică planul din checkFamilyImages.py: aliniază pozele pe grupe de procesor
în interiorul fiecărei familii de 9.

Se atinge DOAR câmpul `images`. Specificațiile, descrierile, prețurile și tot
restul rămân neschimbate (Alex, 4 sep 2026).

Fiecare produs modificat își lasă în jurnal setul de poze dinainte, întreg, ca
să se poată da înapoi: `--undo` reface din jurnal.

    python3 applyFamilyImages.py --plan
    PILOTON_EMAIL=... PILOTON_PASSWORD=... python3 applyFamilyImages.py --run
    PILOTON_EMAIL=... PILOTON_PASSWORD=... python3 applyFamilyImages.py --undo
"""

import argparse
import json
import os
import time

from applyPrices import api_login, get_product, http, API

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, 'family-images-plan.json')
FULL_CACHE = os.path.join(HERE, 'family-images-full-cache.json')
STATE = os.path.join(HERE, 'family-images-apply-state.json')
LOG = os.path.join(HERE, 'family-images-apply-log.jsonl')


def jlog(**kw):
    kw['ts'] = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG, 'a') as f:
        f.write(json.dumps(kw, ensure_ascii=False) + '\n')


def put_images(token, pid, images):
    body = json.dumps({'images': images}).encode()
    return json.loads(http(f'{API}/api/products/{pid}', data=body, method='PUT', headers={
        'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}))


def build_items():
    plan = json.load(open(PLAN))['items']
    full = json.load(open(FULL_CACHE))
    items = []
    for grp in plan:
        src = full.get(grp['sursa']['slug'])
        if not src:
            continue
        src_urls = [i['url'] for i in src['images']]
        for tgt in grp['tinte']:
            items.append({
                'slug': tgt['slug'], 'name': tgt['name'], 'config': tgt['config'],
                'familie': grp['familie'], 'grupa': grp['grupa'],
                'sursa': grp['sursa']['slug'], 'urls': src_urls,
            })
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', action='store_true')
    ap.add_argument('--run', action='store_true')
    ap.add_argument('--undo', action='store_true')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--familie', help='aplică doar familiile al căror nume conține textul')
    args = ap.parse_args()

    if args.undo:
        return undo()

    items = build_items()
    if args.familie:
        items = [i for i in items if args.familie.lower() in i['familie'].lower()]
    if args.limit:
        items = items[:args.limit]
    print(f'{len(items)} produse de actualizat, în {len({i["familie"] for i in items})} familii')
    by_group = {}
    for it in items:
        by_group[it['grupa']] = by_group.get(it['grupa'], 0) + 1
    for g, n in sorted(by_group.items()):
        print(f'  {g:16s} {n}')

    if not args.run:
        print('\n(--plan: nu s-a scris nimic pe producție)')
        return

    state = json.load(open(STATE)) if os.path.exists(STATE) else {}
    token = api_login()
    done = failed = 0
    for i, it in enumerate(items, 1):
        if state.get(it['slug']) == 'ok':
            continue
        try:
            p = get_product(it['slug'])
            pid = p.get('_id')
            before = p.get('images') or []
            images = [{'url': u, 'alt': it['name'], 'isPrimary': k == 0}
                      for k, u in enumerate(it['urls'])]
            put_images(token, pid, images)
            jlog(action='apply', slug=it['slug'], name=it['name'], config=it['config'],
                 familie=it['familie'], grupa=it['grupa'], sursa=it['sursa'],
                 poze_noi=len(images), poze_vechi=before)
            state[it['slug']] = 'ok'
            done += 1
        except Exception as e:
            jlog(action='error', slug=it['slug'], error=str(e))
            state[it['slug']] = 'error'
            failed += 1
        if i % 50 == 0:
            json.dump(state, open(STATE, 'w'))
            print(f'  {i}/{len(items)}  aplicate={done} erori={failed}', flush=True)

    json.dump(state, open(STATE, 'w'))
    print(f'\nGata: {done} aplicate, {failed} erori. Jurnal: {LOG}')


def undo():
    """Reface pozele dinainte, din jurnal (ultima intrare per slug câștigă)."""
    if not os.path.exists(LOG):
        print('Nu există jurnal.')
        return
    prev = {}
    for line in open(LOG):
        rec = json.loads(line)
        if rec.get('action') == 'apply':
            prev[rec['slug']] = rec['poze_vechi']
    print(f'{len(prev)} produse de refăcut')
    token = api_login()
    done = 0
    for slug, images in prev.items():
        p = get_product(slug)
        put_images(token, p['_id'], images)
        jlog(action='undo', slug=slug, poze=len(images))
        done += 1
        if done % 50 == 0:
            print(f'  {done}/{len(prev)}', flush=True)
    print(f'Gata: {done} refăcute.')


if __name__ == '__main__':
    main()

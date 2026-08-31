#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dezactivează (soft-delete) toate navigațiile PilotOn cu 1GB RAM.

RAM se citește din nume: primul „<n>GB" din tiparul „<ram>GB <rom>GB".
DELETE /api/products/:id doar setează status=inactive (reversibil).

Utilizare:
    python3 remove1gb.py               # doar listează ce ar șterge (read-only)
    PILOTON_EMAIL=... PILOTON_PASSWORD=... python3 remove1gb.py --run

Reluabil: progresul e ținut în remove1gb-state.json; jurnal în remove1gb-log.jsonl.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
PLAN = os.path.join(HERE, 'remove1gb-plan.json')
STATE = os.path.join(HERE, 'remove1gb-state.json')
LOG = os.path.join(HERE, 'remove1gb-log.jsonl')

RAM_RE = re.compile(r'(\d+)\s*GB\s*\+?\s*(\d+)\s*GB', re.I)


def log(msg):
    print(msg, flush=True)


def jlog(**kw):
    kw['ts'] = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG, 'a') as f:
        f.write(json.dumps(kw, ensure_ascii=False) + '\n')


def http(url, data=None, method=None, headers=None, timeout=90, tries=5):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f'{method or "GET"} {url}: {last}')


def api_login():
    email = os.environ.get('PILOTON_EMAIL')
    pw = os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Setează PILOTON_EMAIL și PILOTON_PASSWORD în environment.')
    body = json.dumps({'email': email, 'password': pw}).encode()
    resp = json.loads(http(f'{API}/api/auth/login', data=body, method='POST',
                           headers={'Content-Type': 'application/json'}))
    token = resp.get('token') or (resp.get('data') or {}).get('token')
    if not token:
        sys.exit(f'Login eșuat: {resp}')
    return token


def ram_gb(name):
    m = RAM_RE.search(name or '')
    return int(m.group(1)) if m else None


def fetch_all():
    products, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        products.extend(d.get('products', []))
        pg = d.get('pagination', {})
        log(f'  pagina {page}/{pg.get("totalPages", "?")} — {len(products)} produse')
        if not pg.get('hasNextPage'):
            break
        page += 1
    return products


def build_plan():
    log('Aduc produsele din API…')
    products = fetch_all()
    log(f'  {len(products)} produse în total')
    plan = []
    for p in products:
        if p.get('category') != 'navigatii-gps':
            continue
        if not re.match(r'Navigatie PilotOn\b', p.get('name') or '', re.I):
            continue
        if ram_gb(p.get('name')) != 1:
            continue
        plan.append({'id': p.get('_id'), 'slug': p.get('slug'), 'name': p['name'],
                     'price': p.get('price'), 'status': p.get('status')})
    with open(PLAN, 'w') as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
    return plan


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--run', action='store_true', help='dezactivează pe producție (implicit doar listează)')
    args = ap.parse_args()

    plan = build_plan()
    active = [p for p in plan if p['status'] == 'active']
    log(f'\n{len(plan)} navigații cu 1GB ({len(active)} active) — plan scris în {PLAN}')
    for p in plan:
        log(f"  [{p['status']:8}] {p['price']:>6} lei  {p['name']}")

    if not args.run:
        log('\n(read-only) Rulează cu --run pentru a le dezactiva.')
        return

    state = {}
    if os.path.exists(STATE):
        state = json.load(open(STATE))
    todo = [p for p in active if state.get(p['slug']) != 'done']
    log(f'\nDe dezactivat: {len(todo)} (deja făcute: {len(active) - len(todo)})')
    if not todo:
        return

    token = api_login()
    log('login ok')
    ok = failed = 0
    for i, p in enumerate(todo, 1):
        slug, pid = p['slug'], p['id']
        try:
            http(f'{API}/api/products/{pid}', method='DELETE',
                 headers={'Authorization': f'Bearer {token}'})
            state[slug] = 'done'
            jlog(slug=slug, action='deactivate', name=p['name'])
            ok += 1
            log(f"[{i}/{len(todo)}] dezactivat  {p['name'][:70]}")
        except Exception as e:
            state[slug] = 'error'
            jlog(slug=slug, action='error', error=str(e))
            failed += 1
            log(f"[{i}/{len(todo)}] EROARE {slug}: {e}")
        if i % 10 == 0:
            with open(STATE, 'w') as f:
                json.dump(state, f)
        time.sleep(0.15)
    with open(STATE, 'w') as f:
        json.dump(state, f)
    log(f'\nGata: {ok} dezactivate, {failed} erori. Jurnal: {LOG}')


if __name__ == '__main__':
    main()

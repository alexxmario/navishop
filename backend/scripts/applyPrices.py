#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplică pe producție corecțiile de preț decise pe baza raportului checkPrices.py.

Ce aplică (decizia lui Alex, 2026-07-17):
  A. integral produsele de pe modelele nou-adăugate în Excel (apply-buckets.json → A)
  C. produsele cu diferență care NU se termină în 0 (apply-buckets.json → C)
  X. extremele din grupul B: diferență rotundă dar |dif| >= 300 (Octavia x2, Porsche)
Restul grupului B (±50/±100 etc.) rămâne neatins.

Utilizare:
    python3 applyPrices.py --plan     # doar scrie price-apply-plan.json și afișează sumar
    PILOTON_EMAIL=... PILOTON_PASSWORD=... python3 applyPrices.py --run

Reluabil: progresul e ținut în price-apply-state.json; jurnal în price-apply-log.jsonl.
"""

import argparse
import json
import os
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
REPORT = os.path.join(HERE, 'price-check-report.json')
BUCKETS = os.path.join(HERE, 'apply-buckets.json')
PLAN = os.path.join(HERE, 'price-apply-plan.json')
STATE = os.path.join(HERE, 'price-apply-state.json')
LOG = os.path.join(HERE, 'price-apply-log.jsonl')


def log(msg):
    print(msg, flush=True)


def jlog(**kw):
    kw['ts'] = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG, 'a') as f:
        f.write(json.dumps(kw, ensure_ascii=False) + '\n')


def http(url, data=None, method=None, headers=None, timeout=60, tries=4):
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


def get_product(slug):
    resp = json.loads(http(f'{API}/api/products/{slug}', timeout=40))
    return resp.get('product') or resp


def put_price(token, pid, price):
    body = json.dumps({'price': price}).encode()
    return json.loads(http(f'{API}/api/products/{pid}', data=body, method='PUT', headers={
        'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}))


def build_plan():
    report = json.load(open(REPORT))
    buckets = json.load(open(BUCKETS))
    sel = set(buckets['A']) | set(buckets['C'])
    plan, grp = [], {}
    for s in buckets['A']:
        grp[s] = 'A-model-nou'
    for s in buckets['C']:
        grp[s] = 'C-pret-ciudat'
    for m in report['mismatches']:
        slug = m['slug']
        if slug not in sel and m['diff'] % 10 == 0 and abs(m['diff']) >= 300:
            sel.add(slug)
            grp[slug] = 'X-extrem'
    for m in report['mismatches']:
        if m['slug'] in sel:
            plan.append({'slug': m['slug'], 'name': m['name'], 'old': m['price'],
                         'new': m['expected'], 'diff': m['diff'],
                         'family': m['family'], 'group': grp[m['slug']]})
    with open(PLAN, 'w') as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
    return plan


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', action='store_true', help='doar generează planul, nu scrie nimic')
    ap.add_argument('--run', action='store_true', help='aplică planul pe producție')
    ap.add_argument('--only', help='fisier cu lista de slug-uri de corectat; ignora '
                                   'apply-buckets.json si ia doar aceste produse din raport')
    ap.add_argument('--state', help='fisier de stare alternativ (ca sa nu amesteci rulările)')
    args = ap.parse_args()
    if not (args.plan or args.run):
        sys.exit('Folosește --plan sau --run.')
    global STATE
    if args.state:
        STATE = args.state if os.path.isabs(args.state) else os.path.join(HERE, args.state)

    if args.only:
        f = args.only if os.path.isabs(args.only) else os.path.join(HERE, args.only)
        want = set(json.load(open(f)))
        report = json.load(open(REPORT))
        plan = [{'slug': m['slug'], 'name': m['name'], 'old': m['price'], 'new': m['expected'],
                 'diff': m['diff'], 'family': m['family'], 'group': 'only'}
                for m in report['mismatches'] if m['slug'] in want]
        json.dump(plan, open(PLAN, 'w'), ensure_ascii=False, indent=1)
    else:
        plan = build_plan()
    from collections import Counter
    cnt = Counter(p['group'] for p in plan)
    log(f'Plan: {len(plan)} produse — {dict(cnt)}')
    log(f'Scris în {PLAN}')
    if args.plan:
        for p in plan[:10]:
            log(f"  {p['old']:>8} → {p['new']:>5}  [{p['group']}] {p['name'][:70]}")
        return

    state = {}
    if os.path.exists(STATE):
        state = json.load(open(STATE))
    todo = [p for p in plan if state.get(p['slug']) != 'done']
    log(f'De aplicat: {len(todo)} (deja făcute: {len(plan) - len(todo)})')
    if not todo:
        return

    token = api_login()
    log('login ok')
    ok = skipped = failed = 0
    for i, p in enumerate(todo, 1):
        slug = p['slug']
        try:
            prod = get_product(slug)
            pid, cur = prod.get('_id'), prod.get('price')
            if pid is None:
                raise RuntimeError('produs fără _id')
            if cur == p['new']:
                state[slug] = 'done'
                jlog(slug=slug, action='skip', reason='deja corect', price=cur)
                skipped += 1
            elif cur != p['old']:
                state[slug] = 'price-drift'
                jlog(slug=slug, action='skip', reason=f'prețul s-a schimbat între timp: {cur} != {p["old"]}')
                skipped += 1
            else:
                put_price(token, pid, p['new'])
                after = get_product(slug).get('price')
                if after != p['new']:
                    raise RuntimeError(f'verificare eșuată: după PUT prețul e {after}')
                state[slug] = 'done'
                jlog(slug=slug, action='update', old=p['old'], new=p['new'], group=p['group'])
                ok += 1
                log(f"[{i}/{len(todo)}] {p['old']:>8} → {p['new']:>5}  {p['name'][:64]}")
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
    log(f'\nGata: {ok} actualizate, {skipped} sărite, {failed} erori. Jurnal: {LOG}')


if __name__ == '__main__':
    main()

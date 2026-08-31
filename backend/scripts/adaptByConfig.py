#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sincronizeaza pozele intre doua familii potrivind CONFIGURATIA reala (interfata +
diagonala + RAM), nu sufixul numelui — pentru familiile unde numele au forme diferite
("NBT 2013-2021 12.3 Inch ..." vs "2013-2021 NBT 12.9 Inch ...").

Raporteaza si ce lipseste la tinta si ce e dublat, ca sa se vada inainte de a atinge ceva.

  python3 backend/scripts/adaptByConfig.py --from "BMW Seria 3 2012-2017" \
      --to "BMW Seria 4" --dry-run
"""
import argparse, json, os, re, sys, time, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
LOG = os.path.join(HERE, 'adapt-by-config-log.jsonl')
PREFIX = 'Navigatie PilotOn '


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={v}' for k, v in kw.items()), flush=True)


def http(url, data=None, headers=None, method=None, timeout=90, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(url, data=data, method=method,
                                         headers={'User-Agent': 'Mozilla/5.0', **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404):
                raise RuntimeError(f'{e.code} {e.read().decode("utf-8", "ignore")[:200]}')
            if a == retries - 1:
                raise
        except Exception:
            if a == retries - 1:
                raise
        time.sleep(3 * (a + 1))


def fetch_all():
    out, page = [], 1
    while True:
        d = json.loads(http(f'{API}/api/products?limit=200&page={page}&sortBy=_id&sortOrder=asc'))
        out += d.get('products', [])
        if not d.get('pagination', {}).get('hasNextPage'):
            break
        page += 1
    return out


def config_of(tail):
    """(interfata, diagonala, RAM) din coada numelui, indiferent de ordinea cuvintelor.
       "EVO" singur inseamna NBT EVO — asa e scris in catalog la Seria 3/4."""
    line = 'EVO' if re.search(r'\bEVO\b', tail, re.I) else (
        'NBT' if re.search(r'\bNBT\b', tail, re.I) else None)
    d = re.search(r'(\d+(?:\.\d+)?)\s*inch', tail, re.I)
    r = re.search(r'(\d+)GB\s+(\d+)GB', tail, re.I)
    if not (d and r):
        return None
    # interfata poate lipsi cu totul (liniile Tip Tesla n-au NBT/EVO); atunci conteaza
    # doar diagonala si RAM-ul, iar sufixe ca "4G" nu mai impiedica potrivirea
    return (line, d.group(1), f'{r.group(1)}+{r.group(2)}')


def shape_of(tail):
    """Cand aceeasi configuratie apare de doua ori, cele doua produse sunt seturi de poze
       DIFERITE, iar singurul semn care le deosebeste e forma numelui: marcajul de interfata
       inainte de diagonala ("NBT 10.25 Inch ...") sau dupa ea ("10.25 inch NBT ...").
       Fara asta, dublura tintei primeste setul fratelui si un set intreg nu ajunge nicaieri."""
    m = re.search(r'\b(NBT|EVO)\b', tail, re.I)
    d = re.search(r'(\d+(?:\.\d+)?)\s*inch', tail, re.I)
    if not (m and d):
        return 'pre'
    return 'pre' if m.start() < d.start() else 'post'


def n_images(p):
    return p.get('imageCount', len(p.get('images') or []))


def full_images(pid):
    d = json.loads(http(f'{API}/api/products/id/{pid}'))
    return (d.get('product', d)).get('images') or []


def group(live, base):
    """config -> lista de produse, in ordinea descrescatoare a numarului de poze"""
    pre = PREFIX + base + ' '
    out = {}
    for p in live:
        if not p['name'].startswith(pre):
            continue
        tail = p['name'][len(pre):]
        c = config_of(tail)
        if c:
            p = {**p, '_shape': shape_of(tail)}
            out.setdefault(c, []).append(p)
    for v in out.values():
        v.sort(key=n_images, reverse=True)
    return out


def pick(sources, target):
    """la configuratiile dublate, se potriveste forma numelui; altfel, sursa cu cele mai
       multe poze"""
    same = [s for s in sources if s['_shape'] == target['_shape']]
    return (same or sources)[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', required=True)
    ap.add_argument('--to', dest='dst', required=True)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--run', action='store_true')
    args = ap.parse_args()
    if not (args.dry_run or args.run):
        sys.exit('Foloseste --dry-run sau --run.')

    live = fetch_all()
    src, dst = group(live, args.src), group(live, args.dst)

    plan, missing, dupes = [], [], []
    for c in sorted(src):
        if c not in dst:
            missing.append((c, src[c][0]))
            continue
        for i, t in enumerate(dst[c]):
            if i:
                dupes.append(t)
            plan.append({'t': t, 's': pick(src[c], t), 'cfg': c})
    extra = [p for c in sorted(dst) if c not in src for p in dst[c]]

    print(f'{len(plan)} produse de sincronizat:')
    for x in plan:
        c = x['cfg']
        print(f"  {n_images(x['t']):3}p -> {n_images(x['s']):3}p  "
              f"{(c[0] or '-'):3} {c[1]:>5}\" {c[2]:<8}  {x['t']['name']}")
    if dupes:
        print(f'\n{len(dupes)} DUBLURI la tinta (aceeasi configuratie de doua ori, '
              f'primesc si ele pozele):')
        for p in dupes:
            print(f"    {p['name']}  [sku {p.get('sku')}]")
    if missing:
        print(f'\n{len(missing)} configuratii LIPSA la tinta (nu se creeaza de aici):')
        for c, s in missing:
            print(f"    {(c[0] or '-')} {c[1]}\" {c[2]}  <- {s['name']}  [{s.get('price')} lei]")
    if extra:
        print(f'\n{len(extra)} configuratii la tinta care nu exista la sursa:')
        for p in extra:
            print(f"    {p['name']}")
    if args.dry_run:
        return

    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL / PILOTON_PASSWORD')
    token = json.loads(http(f'{API}/api/auth/login',
                            data=json.dumps({'email': email, 'password': pw}).encode(),
                            headers={'Content-Type': 'application/json'}))['token']
    hdr = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    log('login-ok')

    cache, ok = {}, 0
    for x in plan:
        sid = x['s']['_id']
        if sid not in cache:
            cache[sid] = full_images(sid)
        imgs = [{'url': im['url'], 'alt': x['t']['name'], 'isPrimary': i == 0}
                for i, im in enumerate(cache[sid])]
        http(f"{API}/api/products/{x['t']['_id']}", data=json.dumps({'images': imgs}).encode(),
             method='PUT', headers=hdr)
        ok += 1
        log('sincronizat', slug=x['t']['slug'], images=len(imgs), din=x['s']['slug'])
    print(f'\nGata: {ok}/{len(plan)} produse sincronizate.')


if __name__ == '__main__':
    main()

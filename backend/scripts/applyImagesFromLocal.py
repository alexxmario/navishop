#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplica imaginile dintr-un folder local (subfolderul "site" al fiecarui set) pe produsele
de pe navi.piloton.ro, conform unui plan JSON.

Planul (local-apply-plan.json) e o lista de:
  {"folder": "<nume folder in SRC>", "products": [{"slug": ..., "name": ...}, ...]}

Utilizare:
  export PILOTON_EMAIL=... PILOTON_PASSWORD=...
  python3 backend/scripts/applyImagesFromLocal.py --dry-run
  python3 backend/scripts/applyImagesFromLocal.py --limit 1     # un singur set, ca test
  python3 backend/scripts/applyImagesFromLocal.py               # tot

Reluare automata: starea e in local-apply-state.json; seturile deja urcate nu se reurca.
"""
import json, os, re, sys, time, argparse, urllib.request, urllib.error, uuid, threading
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
SRC = os.environ.get('PILOTON_SRC', '/Users/alexmario/Downloads/2026-07-17 rame+navigatii')
PLAN_FILE = os.path.join(HERE, 'local-apply-plan.json')
STATE_FILE = os.path.join(HERE, 'local-apply-state.json')
LOG_FILE = os.path.join(HERE, 'local-apply-log.jsonl')
UA = {'User-Agent': 'Mozilla/5.0'}
MIN_IMAGES = 10
UPLOAD_BATCH = 25

_lock = threading.Lock()


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with _lock:
        with open(LOG_FILE, 'a') as f:
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={v}' for k, v in kw.items() if k != 'urls'),
          flush=True)


def http(url, data=None, headers=None, method=None, timeout=60, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})},
                                         method=method)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            code = getattr(e, 'code', None)
            if code in (401, 403, 404) and attempt == retries - 1:
                raise
            wait = 3 * (attempt + 1) ** 2
            print(f'  retry {attempt+1} ({e}) in {wait}s: {url[:90]}')
            time.sleep(wait)
    raise RuntimeError(f'giving up on {url}')


def site_images(folder):
    """lista sortata de cai absolute din <SRC>/<folder>/site"""
    d = os.path.join(SRC, folder, 'site')
    if not os.path.isdir(d):
        raise RuntimeError(f"nu exista subfolderul 'site' in {folder}")
    files = [f for f in os.listdir(d) if re.search(r'\.(jpe?g|png|webp)$', f, re.I)]

    def order(name):
        m = re.search(r'_(\d+)\.\w+$', name)
        # _00 e prima, apoi _001, _002...; sufixele scurte trec inaintea celor lungi
        return (len(m.group(1)), int(m.group(1))) if m else (9, 9999)
    return [os.path.join(d, f) for f in sorted(files, key=order)]


# ---------------- API piloton ----------------
def api_login():
    email, pw = os.environ.get('PILOTON_EMAIL'), os.environ.get('PILOTON_PASSWORD')
    if not email or not pw:
        sys.exit('Seteaza PILOTON_EMAIL si PILOTON_PASSWORD in environment.')
    body = json.dumps({'email': email, 'password': pw}).encode()
    resp = json.loads(http(f'{API}/api/auth/login', data=body,
                           headers={'Content-Type': 'application/json'}))
    token = resp.get('token') or (resp.get('data') or {}).get('token')
    if not token:
        sys.exit(f'Login esuat: {resp}')
    return token


def api_upload(token, paths):
    """POST /api/upload/images (multipart) -> lista de URL-uri"""
    boundary = uuid.uuid4().hex
    parts = []
    for p in paths:
        name = os.path.basename(p)
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="images"; '
                     f'filename="{name}"\r\nContent-Type: image/jpeg\r\n\r\n'.encode())
        parts.append(open(p, 'rb').read())
        parts.append(b'\r\n')
    parts.append(f'--{boundary}--\r\n'.encode())
    body = b''.join(parts)
    resp = json.loads(http(f'{API}/api/upload/images', data=body, headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Authorization': f'Bearer {token}'}, timeout=600))
    urls = []
    for item in (resp.get('images') or resp.get('files') or resp.get('urls') or
                 (resp if isinstance(resp, list) else [])):
        if isinstance(item, str):
            urls.append(item)
        elif isinstance(item, dict):
            urls.append(item.get('url') or item.get('imageUrl') or item.get('path'))
    if len(urls) != len(paths):
        raise RuntimeError(f'upload: am trimis {len(paths)}, am primit {len(urls)}: {str(resp)[:300]}')
    return urls


def api_put_product(token, pid, images):
    body = json.dumps({'images': images}).encode()
    return json.loads(http(f'{API}/api/products/{pid}', data=body, method='PUT', headers={
        'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}))


def api_product(slug):
    resp = json.loads(http(f'{API}/api/products/{slug}', timeout=40))
    p = resp.get('product') or resp
    return p.get('_id'), len(p.get('images') or []), p.get('name') or slug


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=0, help='proceseaza doar N seturi')
    ap.add_argument('--workers', type=int, default=3)
    ap.add_argument('--plan', default=PLAN_FILE)
    ap.add_argument('--force', action='store_true',
                    help='rescrie si produsele care au deja >=20 imagini (corectii de set)')
    args = ap.parse_args()

    plan = json.load(open(args.plan))
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {'folders': {}, 'products': {}}

    def save_state():
        with _lock:
            for _ in range(5):
                try:
                    payload = json.dumps(state, indent=1)
                    break
                except RuntimeError:      # alt thread a modificat dict-ul in timpul serializarii
                    time.sleep(0.05)
            else:
                return
            tmp = STATE_FILE + '.tmp'
            with open(tmp, 'w') as f:
                f.write(payload)
            os.replace(tmp, STATE_FILE)

    n_prod = sum(len(f['products']) for f in plan)
    print(f'{len(plan)} seturi locale -> {n_prod} produse')
    if args.dry_run:
        for f in plan:
            print(f"  {f['folder'][:70]:70} {len(site_images(f['folder'])):3}p -> "
                  f"{[p['slug'][-45:] for p in f['products']]}")
        return

    token = api_login()
    log('login-ok', api=API)

    def process_folder(f):
        folder = f['folder']
        fstate = state['folders'].get(folder, {})
        try:
            if not fstate.get('uploaded'):
                paths = site_images(folder)
                if len(paths) < MIN_IMAGES:
                    log('folder-skip', folder=folder, reason=f'doar {len(paths)} imagini')
                    state['folders'][folder] = {'error': f'putine imagini: {len(paths)}'}
                    save_state()
                    return
                urls = []
                for i in range(0, len(paths), UPLOAD_BATCH):
                    urls += api_upload(token, paths[i:i + UPLOAD_BATCH])
                fstate = {'uploaded': urls}
                state['folders'][folder] = fstate
                save_state()
                log('uploaded', folder=folder, n=len(urls))
            urls = fstate['uploaded']
            for p in f['products']:
                if state['products'].get(p['slug']) == 'done':
                    continue
                pid, old_n, pname = api_product(p['slug'])
                if old_n >= 20 and not args.force:
                    log('product-skip', slug=p['slug'], reason=f'are deja {old_n} imagini')
                    state['products'][p['slug']] = 'done'
                    save_state()
                    continue
                images = [{'url': u, 'alt': p.get('name') or pname, 'isPrimary': i == 0}
                          for i, u in enumerate(urls)]
                api_put_product(token, pid, images)
                state['products'][p['slug']] = 'done'
                save_state()
                log('product-updated', slug=p['slug'], images=len(images), was=old_n)
        except Exception as e:
            log('folder-error', folder=folder, error=str(e)[:200])
            state['folders'].setdefault(folder, {})['error'] = str(e)[:200]
            save_state()

    def pending():
        out = []
        for f in plan:
            fs = state['folders'].get(f['folder'], {})
            if fs.get('uploaded') and all(state['products'].get(p['slug']) == 'done'
                                          for p in f['products']):
                continue
            out.append(f)
        return out

    for round_no in (1, 2, 3):
        for folder in list(state['folders']):
            if state['folders'][folder].get('error') and not state['folders'][folder].get('uploaded'):
                del state['folders'][folder]
        todo = pending()
        if args.limit:
            todo = todo[:args.limit]
        if not todo:
            break
        print(f'Runda {round_no}: {len(todo)} seturi, workers={args.workers}')
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            list(ex.map(process_folder, todo))
        if not any(v.get('error') for v in state['folders'].values()):
            break
        print('Reincerc seturile cu erori...')
        time.sleep(20)

    done_p = sum(1 for v in state['products'].values() if v == 'done')
    errs = sum(1 for v in state['folders'].values() if v.get('error'))
    print(f'\nGata: {done_p}/{n_prod} produse actualizate, {errs} seturi cu erori. Stare in {STATE_FILE}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aplica imaginile din Google Drive (subfolderul "site" al fiecarui set) pe produsele
cu <20 imagini, conform backend/scripts/image-match-report.json.

Faza 1: doar produsele revendicate de UN SINGUR set (fara ambiguitati).

Utilizare:
  export PILOTON_EMAIL="admin@..."
  export PILOTON_PASSWORD="..."
  python3 backend/scripts/applyImagesFromDrive.py --dry-run          # arata planul
  python3 backend/scripts/applyImagesFromDrive.py --limit 3          # primele 3 foldere (test)
  python3 backend/scripts/applyImagesFromDrive.py                    # tot

Reluare automata: starea e tinuta in apply-images-state.json (langa script);
folderele/produsele deja procesate sunt sarite.
"""
import json, os, re, sys, time, html, argparse, urllib.request, urllib.error, uuid, threading
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('PILOTON_API', 'https://api.navi.piloton.ro')
REPORT = os.path.join(HERE, 'image-match-report.json')
STATE_FILE = os.path.join(HERE, 'apply-images-state.json')
CACHE_DIR = os.path.join(HERE, 'drive-cache')
LOG_FILE = os.path.join(HERE, 'apply-images-log.jsonl')
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


# ---------------- Google Drive ----------------
def drive_list(folder_id):
    """listeaza intrarile unui folder public: [(id, nume)]"""
    raw = http(f'https://drive.google.com/embeddedfolderview?id={folder_id}#list', timeout=40).decode('utf-8', 'ignore')
    entries = re.findall(r'id="entry-([\w-]+)".*?flip-entry-title">([^<]+)<', raw, re.S)
    return [(eid, html.unescape(name).strip()) for eid, name in entries]


def drive_download(file_id, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return False
    for attempt in range(5):
        data = http(f'https://drive.usercontent.google.com/download?id={file_id}&export=download',
                    timeout=120)
        if data[:2] == b'\xff\xd8' or data[:4] == b'\x89PNG' or data[:4] == b'RIFF':
            with open(dest, 'wb') as f:
                f.write(data)
            return True
        # pagina HTML (rate-limit / confirmare) - asteapta si reincearca
        wait = 20 * (attempt + 1)
        print(f'  drive rate-limit pe {file_id}, astept {wait}s (incercarea {attempt+1})')
        time.sleep(wait)
    raise RuntimeError(f'download {file_id}: nu pare imagine dupa 5 incercari ({data[:20]!r})')


def site_subfolder_images(top_url):
    """din linkul folderului-set -> lista sortata [(fileId, nume)] din subfolderul 'site'"""
    m = re.search(r'id=([\w-]+)', top_url)
    if not m:
        raise RuntimeError(f'link fara id: {top_url}')
    entries = drive_list(m.group(1))
    site = [e for e in entries if e[1].lower() == 'site']
    if not site:
        raise RuntimeError(f"nu exista subfolder 'site' (gasit: {[n for _, n in entries]})")
    files = [e for e in drive_list(site[0][0]) if re.search(r'\.(jpe?g|png|webp)$', e[1], re.I)]

    def order(name):
        m2 = re.search(r'_(\d+)\.\w+$', name)
        return int(m2.group(1)) if m2 else 9999
    return sorted(files, key=lambda e: order(e[1]))


# ---------------- API piloton ----------------
def api_login():
    email = os.environ.get('PILOTON_EMAIL')
    pw = os.environ.get('PILOTON_PASSWORD')
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
        'Authorization': f'Bearer {token}'}, timeout=300))
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


def api_product_id(slug):
    resp = json.loads(http(f'{API}/api/products/{slug}', timeout=40))
    p = resp.get('product') or resp
    return p.get('_id'), len(p.get('images') or []), p.get('name') or slug


# ---------------- plan ----------------
def build_plan():
    rep = json.load(open(REPORT))
    claims = {}
    for r in rep:
        if r['status'] != 'MATCH':
            continue
        for t in r['targets']:
            if not t.get('driveUrl'):
                continue
            for p in t['products']:
                claims.setdefault(p['slug'], []).append(
                    {'line': t['line'], 'driveUrl': t['driveUrl'], 'prefix': r['prefix'],
                     'name': p['name']})
    plan = {}   # driveUrl -> {'line', 'products': [{'slug','name'}]}
    ambiguous = {}
    for slug, cs in claims.items():
        if len({c['driveUrl'] for c in cs}) == 1:
            c = cs[0]
            f = plan.setdefault(c['driveUrl'], {'line': c['line'], 'products': []})
            f['products'].append({'slug': slug, 'name': c['name']})
        else:
            ambiguous[slug] = [c['line'] for c in cs]
    return plan, ambiguous


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=0, help='proceseaza doar N foldere')
    ap.add_argument('--workers', type=int, default=3)
    ap.add_argument('--plan', help='fisier de plan explicit [{driveUrl,line,products:[...]}] '
                                   'in loc de match-report (faza 2 / produse noi)')
    args = ap.parse_args()

    os.makedirs(CACHE_DIR, exist_ok=True)
    state = json.load(open(STATE_FILE)) if os.path.exists(STATE_FILE) else {'folders': {}, 'products': {}}

    def save_state():
        with _lock:
            for attempt in range(5):
                try:
                    payload = json.dumps(state, indent=1)
                    break
                except RuntimeError:  # alt thread a modificat dict-ul in timpul serializarii
                    time.sleep(0.05)
            else:
                return
            tmp = STATE_FILE + '.tmp'
            with open(tmp, 'w') as f:
                f.write(payload)
            os.replace(tmp, STATE_FILE)

    if args.plan:
        raw = json.load(open(args.plan))
        plan, ambiguous = {}, {}
        for item in raw:
            f = plan.setdefault(item['driveUrl'], {'line': item.get('line', ''), 'products': []})
            for p in item['products']:
                f['products'].append({'slug': p} if isinstance(p, str) else p)
        print(f'Plan din {os.path.basename(args.plan)}:')
    else:
        plan, ambiguous = build_plan()
    n_prod = sum(len(f['products']) for f in plan.values())
    print(f'{len(plan)} foldere Drive -> {n_prod} produse '
          f'({len(ambiguous)} produse ambigue amanate)')

    if args.dry_run:
        for url, f in list(plan.items())[:20]:
            print(f"  {f['line'][:70]:70} -> {[p['slug'][-45:] for p in f['products']]}")
        print('  ...')
        return

    token = api_login()
    log('login-ok', api=API)

    def process_folder(url, f):
        fstate = state['folders'].get(url, {})
        line = f['line']
        try:
            if not fstate.get('uploaded'):
                files = site_subfolder_images(url)
                if len(files) < MIN_IMAGES:
                    log('folder-skip', line=line, reason=f'doar {len(files)} imagini in site/')
                    state['folders'][url] = {'error': f'putine imagini: {len(files)}'}
                    save_state()
                    return
                fdir = os.path.join(CACHE_DIR, re.sub(r'[^\w-]+', '_', line)[:80])
                os.makedirs(fdir, exist_ok=True)
                paths = []
                for i, (fid, name) in enumerate(files):
                    ext = os.path.splitext(name)[1] or '.jpg'
                    dest = os.path.join(fdir, f'{i+1:03d}{ext}')
                    drive_download(fid, dest)
                    paths.append(dest)
                    time.sleep(0.15)
                log('downloaded', line=line, n=len(paths))
                urls = []
                for i in range(0, len(paths), UPLOAD_BATCH):
                    urls += api_upload(token, paths[i:i+UPLOAD_BATCH])
                fstate = {'uploaded': urls}
                state['folders'][url] = fstate
                save_state()
                log('uploaded', line=line, n=len(urls))
            urls = fstate['uploaded']
            for p in f['products']:
                if state['products'].get(p['slug']) == 'done':
                    continue
                pid, old_n, pname = api_product_id(p['slug'])
                if old_n >= 20:
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
            log('folder-error', line=line, error=str(e)[:200])
            state['folders'].setdefault(url, {})['error'] = str(e)[:200]
            save_state()

    def pending():
        out = []
        for url, f in plan.items():
            fstate = state['folders'].get(url, {})
            if all(state['products'].get(p['slug']) == 'done' for p in f['products']) and fstate.get('uploaded'):
                continue
            out.append((url, f))
        return out

    for round_no in (1, 2, 3):
        # sterge erorile ca sa fie reincercate in aceasta runda
        for url in list(state['folders']):
            if state['folders'][url].get('error') and not state['folders'][url].get('uploaded'):
                del state['folders'][url]
        todo = pending()
        if args.limit:
            todo = todo[:args.limit]
        if not todo:
            break
        print(f'Runda {round_no}: de procesat {len(todo)} foldere, workers={args.workers}')
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            list(ex.map(lambda uf: process_folder(*uf), todo))
        if not any(v.get('error') for v in state['folders'].values()):
            break
        print('Reincerc folderele cu erori...')
        time.sleep(30)

    done_p = sum(1 for v in state['products'].values() if v == 'done')
    errs = sum(1 for v in state['folders'].values() if v.get('error'))
    print(f'\nGata: {done_p}/{n_prod} produse actualizate, {errs} foldere cu erori. Stare in {STATE_FILE}')
    if ambiguous:
        print(f'{len(ambiguous)} produse ambigue (mai multe seturi) - de rezolvat separat.')


if __name__ == '__main__':
    main()

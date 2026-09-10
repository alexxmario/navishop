#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Recolteaza sectiunea „Limitari" de pe paginile live navigatiiandroid.ro.

  python3 backend/scripts/harvestLimitariLive.py            # toate modelele ramase
  python3 backend/scripts/harvestLimitariLive.py --limit 20 # doar primele 20
  python3 backend/scripts/harvestLimitariLive.py --delay 5

Sursa URL-urilor: limitari-model-urls.json (382 de modele, extrase din sitemap-ul
lor) — deci o singura cerere per model. Rezultatul intra direct in
limitari-live-harvest.json, acelasi fisier folosit de makeLimitariSheet.py.

Ritm: robots.txt-ul lor cere Crawl-delay: 5, deci asta e implicit. Nu paraleliza.

Structura paginii lor (verificata 2026-09-10):
  <div id="block_content_N" class="product-content__block ...">
    <h2 class="product-content__block-heading">Limitari</h2>
    textul...
  </div>
"""
import json, os, re, sys, time, argparse, unicodedata, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
URLS_FILE = os.path.join(HERE, 'limitari-model-urls.json')
OUT_FILE = os.path.join(HERE, 'limitari-live-harvest.json')
LOG_FILE = os.path.join(HERE, 'harvest-live-log.jsonl')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG_FILE, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={str(v)[:95]}' for k, v in kw.items()), flush=True)


def http(url, timeout=45, retries=4):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': UA,
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'ro-RO,ro;q=0.9',
            })
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode('utf-8', 'ignore'), None
        except urllib.error.HTTPError as e:
            last = f'HTTP {e.code}'
            if e.code == 404:
                return None, last                       # nu insistam
            if e.code == 429:                            # ne-am grabit; asteptam
                wait = int(e.headers.get('Retry-After', 60))
                log('rate-limit', asteptam=wait)
                time.sleep(wait + 2)
                continue
        except Exception as e:
            last = str(e)
        time.sleep(4 * (attempt + 1))
    return None, last


# ------------------------------------------------------------------ extragere

TAGS = re.compile(r'<[^>]+>')
WS = re.compile(r'[\s ]+')
HEADING = re.compile(
    r'<h2[^>]*class="[^"]*product-content__block-heading[^"]*"[^>]*>\s*'
    r'(?P<title>[^<]{0,60}?)\s*</h2>', re.I)


def clean(html):
    txt = TAGS.sub(' ', html)
    for a, b in (('&nbsp;', ' '), ('&amp;', '&'), ('&quot;', '"'), ('&#039;', "'"),
                 ('&lt;', '<'), ('&gt;', '>'), ('&bdquo;', '"'), ('&rdquo;', '"')):
        txt = txt.replace(a, b)
    return WS.sub(' ', txt).strip()


def deacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s or '')
                   if unicodedata.category(c) != 'Mn').lower()


def block_after(html, start):
    """Textul de la `start` pana la </div>-ul care inchide blocul, cu div-uri echilibrate."""
    depth = 1
    i = start
    while i < len(html) and depth > 0:
        nxt_open = html.find('<div', i)
        nxt_close = html.find('</div', i)
        if nxt_close == -1:
            break
        if nxt_open != -1 and nxt_open < nxt_close:
            depth += 1
            i = nxt_open + 4
        else:
            depth -= 1
            if depth == 0:
                return html[start:nxt_close]
            i = nxt_close + 5
    return html[start:start + 3000]


def extract_limitari(html):
    """Textul din blocul cu titlul „Limitari"/„Limitări"."""
    for m in HEADING.finditer(html):
        if deacc(m.group('title')).startswith('limitar'):
            txt = clean(block_after(html, m.end()))
            if len(txt) >= 15:
                return txt
    return None


def list_blocks(html):
    """Titlurile tuturor blocurilor — ca sa vedem daca pagina s-a incarcat corect."""
    return [clean(m.group('title')) for m in HEADING.finditer(html)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--delay', type=float, default=5.0, help='robots.txt: Crawl-delay 5')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--retry-errors', action='store_true',
                    help='reincearca si modelele marcate anterior cu eroare')
    args = ap.parse_args()

    urls = json.load(open(URLS_FILE, encoding='utf-8'))
    data = json.load(open(OUT_FILE, encoding='utf-8')) if os.path.exists(OUT_FILE) \
        else {'note': 'Recoltare de pe site-ul live navigatiiandroid.ro.', 'results': []}
    by_key = {r['modelLor']: r for r in data['results']}

    FINAL = {'ok', 'fara-limitari'}
    todo = []
    for slug, url in sorted(urls.items()):
        key = slug[len('navigatie-'):] if slug.startswith('navigatie-') else slug
        prev = by_key.get(key)
        if prev is not None:
            st = prev.get('status')
            # inregistrarile vechi (fara status) sunt deja bune
            if st is None or st in FINAL:
                continue
            if not args.retry_errors:
                continue
        todo.append((key, url))
    if args.limit:
        todo = todo[:args.limit]

    log('start', de_citit=len(todo), deja=len(by_key), total_modele=len(urls))

    ok = err = found = 0
    for n, (key, url) in enumerate(todo, 1):
        html, e = http(url)
        if not html:
            by_key[key] = {'modelLor': key, 'url': url, 'limitari': None,
                           'status': 'fetch-error', 'error': e}
            err += 1
            log('eroare', model=key, err=e)
        else:
            blocks = list_blocks(html)
            if not blocks:
                # pagina nu s-a randat cum trebuie — nu o marcam ca „fara limitari"
                by_key[key] = {'modelLor': key, 'url': url, 'limitari': None,
                               'status': 'parse-error', 'error': 'niciun bloc de continut'}
                err += 1
                log('parse-error', model=key, octeti=len(html))
            else:
                lim = extract_limitari(html)
                by_key[key] = {'modelLor': key, 'url': url, 'limitari': lim,
                               'status': 'ok' if lim else 'fara-limitari'}
                ok += 1
                if lim:
                    found += 1
                    log('gasit', model=key, text=lim[:110])

        if n % 10 == 0 or n == len(todo):
            data['results'] = sorted(by_key.values(), key=lambda r: r['modelLor'])
            json.dump(data, open(OUT_FILE, 'w'), ensure_ascii=False, indent=1)
            log('progres', procesate=n, din=len(todo), cu_limitari=found, erori=err)
        time.sleep(args.delay)

    data['results'] = sorted(by_key.values(), key=lambda r: r['modelLor'])
    json.dump(data, open(OUT_FILE, 'w'), ensure_ascii=False, indent=1)
    total_lim = sum(1 for r in data['results'] if r.get('limitari'))
    print(f'\nGata. Citite acum: {ok} | erori: {err} | limitari noi: {found}')
    print(f'Total in fisier: {len(data["results"])} modele, {total_lim} cu limitari')


if __name__ == '__main__':
    main()

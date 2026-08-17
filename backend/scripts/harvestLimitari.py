#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Recolteaza textele „Limitari" de pe paginile navigatiiandroid.ro din arhiva Wayback
(nu din site-ul lor live: acela e in spatele unui gate anti-bot si da 429 dupa 2 cereri).

  python3 backend/scripts/harvestLimitari.py --wait-minutes 45
  python3 backend/scripts/harvestLimitari.py --max-models 20     # tranche mica, de test

Pasi: asteapta ca Internet Archive sa fie disponibil -> enumereaza prin CDX paginile
arhivate -> alege o pagina de produs per model de masina -> descarca HTML-ul arhivat
-> extrage „Limitari". Rezultatul: harvested-limitari.json (reluabil, nu redescarca).

Textele extrase sunt DATE BRUTE de referinta. Nu se publica verbatim — se mapeaza pe
regulile din limitari-library.json, in formularea noastra.
"""
import json, os, re, sys, time, argparse, unicodedata, urllib.request, urllib.error, urllib.parse
import gzip, io

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_FILE = os.path.join(HERE, 'harvested-limitari.json')
SAMPLE_FILE = os.path.join(HERE, 'harvest-sample.html')
LOG_FILE = os.path.join(HERE, 'harvest-limitari-log.jsonl')
CDX_CACHE = os.path.join(HERE, 'limitari-cdx-cache.json')

CDX = 'http://web.archive.org/cdx/search/cdx'
SITE = 'navigatiiandroid.ro'
MAX_SNAPSHOT_TRIES = 3   # capturi alternative de incercat per model, cand una da 404
UA = 'Mozilla/5.0 (compatible; PilotOn-research/1.0)'


def log(event, **kw):
    rec = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'event': event, **kw}
    with open(LOG_FILE, 'a') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(f"[{rec['ts']}] {event}: " + ' '.join(f'{k}={str(v)[:90]}' for k, v in kw.items()), flush=True)


def http(url, timeout=60, retries=3, backoff=3):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA,
                                                       'Accept-Encoding': 'gzip'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                raw = r.read()
                if r.headers.get('Content-Encoding') == 'gzip':
                    raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
                return raw, None
        except urllib.error.HTTPError as e:
            last = f'{e.code}'
        except Exception as e:
            last = str(e)
        if attempt < retries - 1:
            time.sleep(backoff * (attempt + 1))
    return None, last


def wait_for_ia(minutes):
    """Internet Archive cade des cu 503. Asteptam pana revine."""
    deadline = time.time() + minutes * 60
    probe = f'{CDX}?url={SITE}&output=json&limit=1'
    delay = 30
    while time.time() < deadline:
        raw, err = http(probe, timeout=30, retries=1)
        if raw and raw.strip().startswith(b'['):
            log('ia-disponibil')
            return True
        left = int(deadline - time.time())
        log('ia-indisponibil', eroare=err, reincerc_in=delay, secunde_ramase=left)
        time.sleep(min(delay, max(5, left)))
        delay = min(delay * 2, 300)
    log('ia-timeout', minute=minutes)
    return False


def cdx_urls():
    """Toate URL-urile arhivate cu 200 care arata ca pagini de produs/model."""
    rows, resume = [], None
    while True:
        params = {'url': SITE, 'matchType': 'domain', 'output': 'json',
                  'fl': 'original,timestamp', 'filter': 'statuscode:200',
                  'collapse': 'urlkey', 'limit': '20000', 'showResumeKey': 'true'}
        if resume:
            params['resumeKey'] = resume
        raw, err = http(f'{CDX}?{urllib.parse.urlencode(params)}', timeout=180)
        if err:
            log('cdx-eroare', eroare=err)
            break
        try:
            data = json.loads(raw)
        except Exception as e:
            log('cdx-parse-eroare', eroare=str(e), start=raw[:120].decode('utf-8', 'ignore'))
            break
        if not data:
            break
        body = data[1:] if data and data[0] and data[0][0] == 'original' else data
        # ultimul rand poate fi resumeKey (precedat de un rand gol)
        resume = None
        if len(body) >= 2 and body[-1] and len(body[-1]) == 1:
            resume = body[-1][0]
            body = body[:-2] if body[-2] == [] else body[:-1]
        rows.extend(r for r in body if len(r) >= 2)
        log('cdx-pagina', randuri=len(body), total=len(rows), mai_e=bool(resume))
        if not resume:
            break
    return rows


# In arhiva, paginile de produs stau sub /cumpara/<slug>, iar slugul contine
# marca + modelul + anii. Structura actuala a site-ului (/navigatie-<model>/<produs>)
# e mai noua decat snapshoturile, deci acceptam ambele forme.
LIVE_URL = re.compile(r'^https?://(?:www\.)?navigatiiandroid\.ro/(navigatie-[^/?#]+)/([^/?#]+)/?$', re.I)
BUY_URL = re.compile(r'^https?://(?:www\.)?navigatiiandroid\.ro/cumpara/([^/?#]+)/?$', re.I)

# tokeni de "ambalaj" din slug, care nu fac parte din numele masinii
SLUG_NOISE = re.compile(r'^(navigatie|dedicata|cu|android|1din|2din|1-din|2-din|casetofon|'
                        r'mp5|player|multimedia|carplay|tip|tesla)$', re.I)
SLUG_YEARS = re.compile(r'-((?:19|20)\d{2})-((?:19|20)\d{2})-|'
                        r'-dupa-((?:19|20)\d{2})-', re.I)


def parse_buy_slug(slug):
    """'navigatie-dedicata-cu-android-honda-cr-v-iv-2012-2018-6gb-ram-...' -> ('honda cr v iv', '2012-2018')"""
    m = SLUG_YEARS.search(slug)
    if not m:
        return None, None
    years = f'{m.group(1)}-{m.group(2)}' if m.group(1) else f'dupa {m.group(3)}'
    toks = [t for t in slug[:m.start()].split('-') if t and not SLUG_NOISE.match(t)]
    car = ' '.join(toks)
    return (car or None), years


def group_by_model(rows):
    """{ cheie_masina: [(url, timestamp), ...] } — candidati, cel mai recent primul.

    Pastram TOTI candidatii, nu doar cel mai recent: arhiva intoarce uneori 404 pe o
    captura anume chiar daca alta captura a aceleiasi pagini se descarca fara probleme.
    """
    groups = {}
    for original, ts in rows:
        key = None
        m = BUY_URL.match(original)
        if m:
            if 'navigatie' not in m.group(1).lower():
                continue                      # camere, cabluri, accesorii — nu ne interesează
            car, years = parse_buy_slug(m.group(1))
            if car and years:
                key = f'{car} {years}'.replace(' ', '-')
        else:
            m = LIVE_URL.match(original)
            if m and m.group(2).startswith('navigatie'):
                key = m.group(1)
        if not key:
            continue
        groups.setdefault(key, []).append((original, ts))
    for key in groups:
        groups[key].sort(key=lambda ut: ut[1], reverse=True)
    return groups


# --------------------------------------------------------------- extragere HTML

TAGS = re.compile(r'<[^>]+>')
WS = re.compile(r'[\s ]+')


def clean(html):
    txt = TAGS.sub(' ', html)
    txt = (txt.replace('&nbsp;', ' ').replace('&amp;', '&')
              .replace('&quot;', '"').replace('&#039;', "'")
              .replace('&lt;', '<').replace('&gt;', '>'))
    return WS.sub(' ', txt).strip()


def deacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn').lower()


# Structura reala a paginilor lor (verificata pe HTML arhivat, 17 aug 2026):
#   <div class="product-attributes__item">
#     <div class="product-attributes__label">Limitari</div>
#     <div class="product-attributes__value">textul</div>
#   </div>
ATTR_ITEM = re.compile(
    r'product-attributes__label"?\s*>(?P<label>.*?)</div>\s*'
    r'<div[^>]*product-attributes__value"?\s*>(?P<value>.*?)</div>',
    re.I | re.S)


def extract_attributes(html):
    """{eticheta_normalizata: valoare} din tabelul de specificatii."""
    attrs = {}
    for m in ATTR_ITEM.finditer(html):
        label = clean(m.group('label'))
        value = clean(m.group('value'))
        if label:
            attrs[deacc(label)] = value
    return attrs


def extract_limitari(html):
    """Valoarea atributului 'Limitari'. Intai parsare structurata, apoi scanare libera."""
    attrs = extract_attributes(html)
    for key, val in attrs.items():
        if key.startswith('limitar') and val and len(val) >= 10:
            return val
    return extract_limitari_loose(html)


def extract_limitari_loose(html):
    """Rezerva: gaseste eticheta Limitari si intoarce textul care o urmeaza."""
    flat = WS.sub(' ', html)
    plain = clean(flat)
    hay = deacc(plain)
    for label in ('limitari', 'limitare'):
        i = hay.find(label)
        while i != -1:
            after = plain[i + len(label):].lstrip(' :·-–—')
            # opreste la urmatoarea eticheta de spec (Cuvant urmat de ':') sau la 400 car.
            cut = re.split(r'\s(?=(?:Garantie|Garanție|Observatii|Observații|Mentiuni|'
                           r'Mențiuni|Note|Brand|SKU|Categorii|Compatibilitate)\b)',
                           after[:600])[0]
            cut = cut.strip()
            if 25 <= len(cut) <= 500 and re.search(r'[a-zA-Z]{4}', cut):
                return cut
            i = hay.find(label, i + 1)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wait-minutes', type=int, default=45,
                    help='cat asteptam ca Internet Archive sa revina')
    ap.add_argument('--max-models', type=int, default=0, help='0 = toate')
    ap.add_argument('--delay', type=float, default=1.0, help='pauza intre descarcari (s)')
    ap.add_argument('--refresh-cdx', action='store_true',
                    help='reinterogheaza CDX chiar daca exista cache local')
    args = ap.parse_args()

    # Indexul CDX se schimba rar, iar Internet Archive e des indisponibil — il ținem
    # local ca sa nu depindem de el la fiecare reluare.
    rows = None
    if os.path.exists(CDX_CACHE) and not args.refresh_cdx:
        try:
            data = json.load(open(CDX_CACHE, encoding='utf-8'))
            rows = [r for r in (data[1:] if data and data[0] and data[0][0] == 'original' else data)
                    if len(r) >= 2]
            log('cdx-din-cache', randuri=len(rows), fisier=os.path.basename(CDX_CACHE))
        except Exception as e:
            log('cdx-cache-corupt', eroare=str(e))
            rows = None

    if not wait_for_ia(args.wait_minutes):
        sys.exit('Internet Archive tot indisponibil. Reruleaza mai tarziu — scriptul e reluabil.')

    if not rows:
        log('enumerare-cdx')
        rows = cdx_urls()
        if not rows:
            sys.exit('CDX nu a intors nimic.')
        json.dump([['original', 'timestamp']] + rows, open(CDX_CACHE, 'w'), ensure_ascii=False)
        log('cdx-cache-scris', randuri=len(rows), fisier=os.path.basename(CDX_CACHE))
    models = group_by_model(rows)
    log('modele-gasite', modele=len(models), randuri_cdx=len(rows))

    out = json.load(open(OUT_FILE, encoding='utf-8')) if os.path.exists(OUT_FILE) else {}
    # doar rezultatele definitive conteaza ca "gata"; erorile de retea se reincearca
    DONE = {'ok', 'fara-limitari'}
    todo = [(m, cands) for m, cands in sorted(models.items())
            if out.get(m, {}).get('status') not in DONE]
    if args.max_models:
        todo = todo[:args.max_models]
    log('de-descarcat', modele=len(todo), deja=len(out))

    saved_sample = os.path.exists(SAMPLE_FILE)
    consecutive_errors = 0
    aborted = False
    for n, (model, candidates) in enumerate(todo, 1):
        raw = err = None
        url = ts = None
        # incercam capturile de la cea mai recenta spre cele mai vechi: un 404 pe o
        # captura nu inseamna ca pagina lipseste din arhiva
        for url, ts in candidates[:MAX_SNAPSHOT_TRIES]:
            raw, err = http(f'https://web.archive.org/web/{ts}id_/{url}', timeout=90)
            if raw:
                break
            if err and '503' in str(err):
                consecutive_errors += 1
                if consecutive_errors >= 3:
                    log('ia-a-picat-reasteptam', model=model)
                    if wait_for_ia(args.wait_minutes):
                        consecutive_errors = 0
                        raw, err = http(f'https://web.archive.org/web/{ts}id_/{url}', timeout=90)
                        if raw:
                            break
                    else:
                        log('renunt-ia-indisponibil', procesate=n - 1, din=len(todo))
                        aborted = True
                        break
        if aborted:
            break
        if err or not raw:
            out[model] = {'url': url, 'timestamp': ts, 'status': 'fetch-error',
                          'error': err, 'capturiIncercate': len(candidates[:MAX_SNAPSHOT_TRIES])}
            log('descarcare-eroare', model=model, eroare=err)
        else:
            consecutive_errors = 0
            html = raw.decode('utf-8', 'ignore')
            if not saved_sample:
                open(SAMPLE_FILE, 'w').write(html)
                saved_sample = True
                log('sample-salvat', fisier=SAMPLE_FILE, model=model)
            lim = extract_limitari(html)
            attrs = extract_attributes(html)
            # pastram si celelalte atribute "moi" — se mapeaza pe romanianSpecs.additional
            # si nu vrem sa redescarcam 460 de pagini daca ne trebuie mai tarziu
            extra = {k: v for k, v in attrs.items()
                     if k.startswith(('observati', 'mentiun', 'note', 'garanti'))}
            # Zero atribute = n-am citit de fapt tabelul de specificatii (pagina de
            # eroare a arhivei, redirect, alt layout). A marca asta 'fara-limitari' ar
            # fi un fals negativ, deci o tratam ca eroare reluabila.
            if not attrs:
                out[model] = {'url': url, 'timestamp': ts, 'status': 'parse-error',
                              'error': 'zero atribute in pagina'}
                log('parse-error', model=model, octeti=len(html))
            else:
                out[model] = {'url': url, 'timestamp': ts,
                              'status': 'ok' if lim else 'fara-limitari',
                              'limitariRaw': lim, 'atributeExtra': extra,
                              'nrAtribute': len(attrs)}
                if lim:
                    log('gasit', model=model, text=lim[:100])
        if n % 10 == 0 or n == len(todo):
            json.dump(out, open(OUT_FILE, 'w'), ensure_ascii=False, indent=1)
            found = sum(1 for v in out.values() if v.get('limitariRaw'))
            log('progres', procesate=n, din=len(todo), cu_limitari=found)
        time.sleep(args.delay)

    json.dump(out, open(OUT_FILE, 'w'), ensure_ascii=False, indent=1)
    found = {k: v for k, v in out.items() if v.get('limitariRaw')}
    print(f'\nModele procesate: {len(out)} | cu Limitari: {len(found)}')
    variants = {}
    for k, v in found.items():
        variants.setdefault(deacc(v['limitariRaw'])[:80], []).append(k)
    print(f'Texte distincte de limitari: {len(variants)}\n')
    for txt, ms in sorted(variants.items(), key=lambda kv: -len(kv[1]))[:15]:
        print(f'  [{len(ms):3d} modele] {txt}...')
    print(f'\nScris {OUT_FILE}')


if __name__ == '__main__':
    main()

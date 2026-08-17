#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Potrivirea modelelor de masina intre catalogul nostru si o sursa externa.

Modul folosit de mapHarvestToLibrary.py. Se poate rula si direct, ca raport:

  python3 backend/scripts/matchCarModels.py --report

De ce exista: suprapunerea simpla de ani da potriviri GRESITE la granita dintre
generatii. 'Audi A3 2003-2011' (8P) se suprapune cu 'Audi A3 8L 1996-2003' un
singur an si o potrivire naiva le considera acelasi lucru. La fel 'BMW Seria 3
2012-2017' (F30) cu 'Seria 3 E90 2004-2013'. De aceea:

  - cerem suprapunere SUBSTANTIALA (>= MIN_OVERLAP din intervalul mai ingust)
  - alegem candidatul cu suprapunerea cea mai mare, nu primul gasit
  - daca doi candidati sunt aproape la fel de buni, marcam 'ambiguu' pentru om
  - codul de generatie (8P, E90, F30, B7, T6...) e semnal puternic: daca ambele
    parti au coduri si nu se intersecteaza, respingem potrivirea
"""
import re, unicodedata, argparse, json, os, sys

MIN_OVERLAP = 0.60      # fractiune din intervalul mai ingust
AMBIGUOUS_MARGIN = 0.15  # daca al doilea candidat e la < 15% de primul -> ambiguu

# coduri de generatie/platforma: litera+cifre sau cifre+litera, ex E90, F30, 8P, B7, T5, W204
GEN_CODE = re.compile(r'^(?:[a-z]{1,2}\d{1,3}[a-z]?|\d{1,2}[a-z]\d?)$', re.I)
ROMAN = re.compile(r'^(?:i{1,3}|iv|v|vi{1,3}|ix|x{1,2})$', re.I)


def deacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s or '')
                   if unicodedata.category(c) != 'Mn').lower()


def norm(s):
    s = deacc(s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    for a, b in (('cr v', 'crv'), ('hr v', 'hrv'), ('fr v', 'frv'), ('c max', 'cmax'),
                 ('s max', 'smax'), ('b max', 'bmax'), ('mercedes benz', 'mercedes')):
        s = re.sub(rf'\b{a}\b', b, s)
    return re.sub(r'\s+', ' ', s).strip()


def tokens(s):
    return [t for t in norm(s).split() if t]


def split_tokens(s):
    """(tokeni_de_baza, coduri_de_generatie) — cifrele romane se ignora."""
    base, codes = [], set()
    for t in tokens(s):
        if ROMAN.match(t):
            continue
        if GEN_CODE.match(t) and not t.isalpha():
            codes.add(t)
        else:
            base.append(t)
    return base, codes


def parse_years(txt):
    t = deacc(txt or '')
    m = re.search(r'(\d{4})\s*-\s*(\d{4})', t)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r'dupa[\s-]+(\d{4})', t) or re.search(r'(\d{4})\s*\+', t)
    if m:
        return int(m.group(1)), 2099
    m = re.search(r'(\d{4})', t)
    if m:
        return int(m.group(1)), int(m.group(1))
    return None, None


GROUP_KEY = re.compile(r'^(?P<car>.+?)-(?P<years>dupa-(?:19|20)\d{2}|(?:19|20)\d{2}-(?:19|20)\d{2})$')


def parse_group_key(key):
    """'bmw-seria-3-e46-1997-2005' -> ('bmw seria 3 e46', '1997-2005')
       'dacia-dokker-dupa-2012'    -> ('dacia dokker', 'dupa 2012')
    Atentie: anii se intorc cu cratima intacta — parse_years are nevoie de ea."""
    m = GROUP_KEY.match(key)
    if not m:
        return key.replace('-', ' '), ''
    years = m.group('years')
    years = years.replace('dupa-', 'dupa ') if years.startswith('dupa-') else years
    return m.group('car').replace('-', ' '), years


def overlap_fraction(a1, a2, b1, b2):
    """Cat din intervalul mai ingust e acoperit de celalalt."""
    if None in (a1, a2, b1, b2):
        return 0.0
    lo, hi = max(a1, b1), min(a2, b2)
    if hi < lo:
        return 0.0
    inter = hi - lo + 1
    narrow = min(a2 - a1 + 1, b2 - b1 + 1)
    return inter / narrow if narrow > 0 else 0.0


def score(our_car, our_years, their_car, their_years):
    """0..1, sau 0 daca incompatibile. Plus motivul respingerii."""
    ob, oc = split_tokens(our_car)
    tb, tc = split_tokens(their_car)
    if not ob or not tb:
        return 0.0, 'fara-tokeni'
    # marca (primul token) trebuie sa coincida
    if ob[0] != tb[0]:
        return 0.0, 'marca-diferita'
    # Identitatea modelului = TOTI tokenii fara marca, inclusiv cei care arata ca
    # coduri de generatie (X3, Q5, B7...). Altfel 'BMW Seria 1' se potrivea cu
    # 'BMW X3 E83': 'x3' era clasificat drept cod de generatie, iar setul de baza
    # ramas ({'bmw'}) era subset al nostru.
    mo = (set(ob) | oc) - {ob[0]}
    mt = (set(tb) | tc) - {tb[0]}
    if not mo or not mt:
        return 0.0, 'model-lipsa'
    if not (mo <= mt or mt <= mo):
        return 0.0, 'model-diferit'
    # coduri de generatie: daca ambele parti le au si nu se intersecteaza -> alta generatie
    if oc and tc and not (oc & tc):
        return 0.0, 'generatie-diferita'
    so, st = mo, mt
    oy1, oy2 = parse_years(our_years)
    ty1, ty2 = parse_years(their_years)
    frac = overlap_fraction(oy1, oy2, ty1, ty2)
    if frac < MIN_OVERLAP:
        return 0.0, f'suprapunere-ani-mica({frac:.2f})'
    token_sim = len(so & st) / max(len(so), len(st))
    code_bonus = 0.15 if (oc & tc) else 0.0
    return min(1.0, 0.55 * frac + 0.30 * token_sim + code_bonus), 'ok'


def best_match(our_car, our_years, candidates):
    """candidates: [(car, years, payload)] -> (payload, scor, stare, alternative)"""
    scored = []
    for car, years, payload in candidates:
        s, why = score(our_car, our_years, car, years)
        if s > 0:
            scored.append((s, car, years, payload))
    if not scored:
        return None, 0.0, 'fara-potrivire', []
    scored.sort(key=lambda x: -x[0])
    top = scored[0]
    state = 'sigur'
    if len(scored) > 1 and (top[0] - scored[1][0]) < AMBIGUOUS_MARGIN:
        state = 'ambiguu'
    return top[3], top[0], state, [(round(s, 3), c, y) for s, c, y, _ in scored[:4]]


# ------------------------------------------------------------------ autotest

CASES = [
    # (nostru, anii nostri, ai lor, anii lor, se potriveste?)
    ('Audi A3', '2003-2011', 'audi a3 8l1', '1996-2003', False),
    ('Audi A3', '2003-2011', 'audi a3 8p1', '2003-2013', True),
    ('BMW Seria 3', '2012-2017', 'bmw seria 3 e90', '2004-2013', False),
    ('BMW Seria 3', '2012-2017', 'bmw seria 3 f30', '2011-2016', True),
    ('BMW Seria 3', '2004-2013', 'bmw seria 3 e90', '2004-2013', True),
    ('Audi A4 B7', '2004-2008', 'audi a4 b6 b7', '2000-2008', True),
    ('Honda CRV', 'dupa 2012', 'honda crv iv', '2012-2018', True),
    ('VW Passat B7', '2010-2014', 'vw passat b6', '2005-2010', False),
    ('Ford Focus II', '2004-2011', 'ford focus 2', '2004-2011', True),
    ('Opel Astra H', '2004-2010', 'opel astra j', '2009-2015', False),
    ('BMW Seria 5 E39', '1995-2003', 'bmw seria 5 e60 e61', '2004-2012', False),
    # X3/Q5/etc sunt NUME de model, nu coduri de generatie
    ('BMW Seria 1', '2004-2011', 'bmw x3 e83', '2003-2011', False),
    ('BMW Seria 5', '2011-2017', 'bmw x1 e84', '2009-2015', False),
    ('BMW X3 F25', '2011-2017', 'bmw x3 e83', '2003-2011', False),
    ('BMW X3 F25', '2011-2017', 'bmw x3 f25', '2010-2017', True),
    ('Audi Q5', '2008-2016', 'audi q7', '2005-2015', False),
    ('VW Transporter T6', '2015-2022', 'vw transporter t5', '2003-2015', False),
]


def selftest():
    ok = True
    for our, oy, their, ty, expected in CASES:
        s, why = score(our, oy, their, ty)
        got = s > 0
        flag = 'OK ' if got == expected else 'FAIL'
        if got != expected:
            ok = False
        print(f'  {flag} {our} {oy:12s} vs {their} {ty:12s} -> {s:.2f} ({why})')
    return ok


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()
    print('Autotest potrivire generatii:')
    sys.exit(0 if selftest() else 1)

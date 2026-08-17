#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Transforma harvested-limitari.json (text brut de referinta) in intrari propuse
pentru limitari-library.json — clasificate pe regulile noastre, cu formularea noastra.

  python3 backend/scripts/mapHarvestToLibrary.py
  python3 backend/scripts/mapHarvestToLibrary.py --merge     # scrie in limitari-library.json

Nu inventeaza nimic: textele care nu se potrivesc pe nicio regula cunoscuta ajung in
`neclasificate` ca sa fie citite de om. Toate intrarile propuse pornesc cu status=review.

Potrivirea model-concurenta -> model-PilotOn e doar o SUGESTIE (scor + candidati);
se confirma manual inainte de publicare.
"""
import json, os, re, sys, time, argparse, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
HARVEST_FILE = os.path.join(HERE, 'harvested-limitari.json')
LIB_FILE = os.path.join(HERE, 'limitari-library.json')
PROPOSAL_FILE = os.path.join(HERE, 'limitari-proposed.json')
OUR_MODELS_FILE = os.path.join(HERE, 'our-car-models.json')   # optional, din applyLimitari

# ------------------------------------------------------- clasificare text brut

# ordinea conteaza: prima regula care se potriveste bate
RULES = [
    ('fibra-optica-most', r'fibr[aă]\s+optic|\bmost\b'),
    ('amplificator-fabrica', r'\bbose\b|\bharman\b|\bjbl\b|\bbang\s*&?\s*olufsen\b|'
                             r'\bburmester\b|amplificator|sistem\s+audio\s+premium'),
    ('clima-display', r'clima|climatizare|\bac\b\s+digital'),
    ('display-fabrica-pastrat', r'display(?:ul)?\s+original|ecran(?:ul)?\s+original|'
                                r'display(?:ul)?\s+din\s+bord'),
    ('nav-originala-adaptor', r'navigat[iț]ie\s+original|nav[iy]\s+original|'
                              r'cablu\s+suplimentar|adaptor\s+suplimentar'),
    ('fitment-diagonala', r'diagonal|nu\s+se\s+poate\s+monta|ram[aă]\s+specific|'
                          r'doar\s+pe\s+versiun'),
]
RULES = [(rid, re.compile(pat, re.I)) for rid, pat in RULES]


def deacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s or '')
                   if unicodedata.category(c) != 'Mn').lower()


def classify(raw):
    """Text brut -> lista de reguli ale noastre."""
    hay = deacc(raw)
    hits = [rid for rid, pat in RULES if pat.search(hay)]
    return hits


# ------------------------------------------------- parsare slug de la concurenta

# navigatie-honda-cr-v-4-2012-2018 -> honda / cr v 4 / 2012-2018
SLUG_RE = re.compile(r'^navigatie-(?P<rest>.+?)(?:-(?P<y1>(?:19|20)\d{2})-(?P<y2>(?:19|20)\d{2}))?$')
BRANDS = ['alfa-romeo', 'land-rover', 'mercedes', 'ssangyong', 'vw', 'bmw', 'audi', 'ford',
          'opel', 'peugeot', 'renault', 'hyundai', 'kia', 'toyota', 'honda', 'nissan',
          'skoda', 'seat', 'fiat', 'citroen', 'dacia', 'mazda', 'jeep', 'suzuki',
          'mitsubishi', 'subaru', 'chevrolet', 'volvo', 'porsche', 'lexus', 'mini',
          'lancia', 'isuzu', 'chrysler', 'rover', 'smart', 'dodge', 'daewoo', 'daihatsu',
          'infiniti', 'iveco', 'jaguar', 'lada', 'saab', 'universale']


def parse_slug(slug):
    m = SLUG_RE.match(slug)
    if not m:
        return None
    rest = m.group('rest')
    brand = next((b for b in sorted(BRANDS, key=len, reverse=True)
                  if rest == b or rest.startswith(b + '-')), None)
    model = rest[len(brand) + 1:] if brand and len(rest) > len(brand) else ''
    y1 = int(m.group('y1')) if m.group('y1') else None
    y2 = int(m.group('y2')) if m.group('y2') else None
    return {'brand': brand, 'model': model.replace('-', ' '), 'yearFrom': y1, 'yearTo': y2}


def norm_car(s):
    s = deacc(s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    for a, b in (('cr v', 'crv'), ('hr v', 'hrv'), ('fr v', 'frv')):
        s = re.sub(rf'\b{a}\b', b, s)
    # generatii in cifre romane -> le lasam, dar scoatem numerele de generatie izolate
    return re.sub(r'\s+', ' ', s).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--merge', action='store_true',
                    help='adauga intrarile propuse in limitari-library.json (status=review)')
    args = ap.parse_args()

    if not os.path.exists(HARVEST_FILE):
        sys.exit(f'Lipseste {HARVEST_FILE} — ruleaza mai intai harvestLimitari.py')
    harvest = json.load(open(HARVEST_FILE, encoding='utf-8'))
    lib = json.load(open(LIB_FILE, encoding='utf-8'))
    known_ids = {e['id'] for e in lib['entries']}

    with_text = {k: v for k, v in harvest.items() if v.get('limitariRaw')}
    print(f'Modele recoltate: {len(harvest)} | cu text de limitari: {len(with_text)}')

    proposed, unclassified = [], []
    for slug, rec in sorted(with_text.items()):
        raw = rec['limitariRaw']
        rules = classify(raw)
        parsed = parse_slug(slug) or {}
        item = {
            'id': slug,
            'car': f"{(parsed.get('brand') or '?').replace('-', ' ').title()} "
                   f"{(parsed.get('model') or '').title()}".strip(),
            'yearFrom': parsed.get('yearFrom'),
            'yearTo': parsed.get('yearTo'),
            'matchCar': [norm_car(f"{parsed.get('brand') or ''} {parsed.get('model') or ''}")],
            'rules': rules,
            'status': 'review',
            'source': f"navigatiiandroid.ro/{slug} (arhiva {rec.get('timestamp', '?')})",
            'sourceRaw': raw,
        }
        if not rules:
            unclassified.append(item)
        else:
            proposed.append(item)

    # grupare pe combinatii de reguli, ca sa se vada tiparul
    import collections
    combos = collections.Counter(tuple(p['rules']) for p in proposed)
    print(f'\nClasificate: {len(proposed)} | neclasificate: {len(unclassified)}')
    print('\nCombinatii de reguli:')
    for combo, n in combos.most_common():
        print(f'  {n:4d}  {" + ".join(combo)}')

    missing_years = [p for p in proposed if not p['yearFrom']]
    dup = [p for p in proposed if p['id'] in known_ids]
    print(f'\nFara ani in slug (de completat manual): {len(missing_years)}')
    print(f'Deja in biblioteca: {len(dup)}')

    if unclassified:
        print('\nTexte neclasificate (primele 10) — de citit si de adaugat regula noua:')
        seen = set()
        for u in unclassified:
            key = deacc(u['sourceRaw'])[:60]
            if key in seen:
                continue
            seen.add(key)
            print(f'  [{u["id"]}] {u["sourceRaw"][:150]}')
            if len(seen) >= 10:
                break

    json.dump({'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
               'proposed': proposed, 'neclasificate': unclassified},
              open(PROPOSAL_FILE, 'w'), ensure_ascii=False, indent=1)
    print(f'\nScris {PROPOSAL_FILE}')

    if args.merge:
        added = 0
        for p in proposed:
            if p['id'] in known_ids:
                continue
            lib['entries'].append(p)
            known_ids.add(p['id'])
            added += 1
        lib['updatedAt'] = time.strftime('%Y-%m-%d')
        json.dump(lib, open(LIB_FILE, 'w'), ensure_ascii=False, indent=1)
        print(f'Adaugate in biblioteca: {added} intrari (toate pe status=review)')
        print('Verifica-le, treci pe status=publish ce e confirmat, apoi:')
        print('  python3 backend/scripts/applyLimitari.py --plan')


if __name__ == '__main__':
    main()

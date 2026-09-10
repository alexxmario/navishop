#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel cu FIECARE PRODUS de-al nostru care ar primi o limitare.

  python3 backend/scripts/makeProductLimitariSheet.py

Scrie limitari-produse.csv / .xlsx. Un rand = un produs, cu:
  - textul LOR (verbatim, doar ca referinta)
  - TEXTUL NOSTRU propus pentru publicare (reformulat)
  - coloana goala „Se aplica?" pentru decizia lui Alex

Reformulare: textele lor trimit la produse auxiliare din magazinul lor
(„acest cablu adaptor care se achizitioneaza separat"). Noi nu vindem
cablurile alea, deci textul nostru spune conditia + faptul ca adaptorul nu e
in pachet + sa ne scrie inainte de comanda. Nu se copiaza formularea lor.
"""
import json, os, re, sys, csv, argparse, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
HARVEST = os.path.join(HERE, 'limitari-live-harvest.json')
CSV_OUT = os.path.join(HERE, 'limitari-produse.csv')
XLSX_OUT = os.path.join(HERE, 'limitari-produse.xlsx')
SITE = 'https://navi.piloton.ro/product/'

_s = importlib.util.spec_from_file_location('mcm', os.path.join(HERE, 'matchCarModels.py'))
mcm = importlib.util.module_from_spec(_s)
_a, sys.argv = sys.argv, [sys.argv[0]]
_s.loader.exec_module(mcm)
sys.argv = _a

_s2 = importlib.util.spec_from_file_location('al', os.path.join(HERE, 'applyLimitari.py'))
al = importlib.util.module_from_spec(_s2)
_a, sys.argv = sys.argv, [sys.argv[0], '--plan']
_s2.loader.exec_module(al)
sys.argv = _a

CONTACT_ADAPTOR = 'Scrie-ne înainte de comandă și ți-l pregătim odată cu navigația.'
CONTACT_VERIF = 'Scrie-ne înainte de comandă ca să verificăm împreună ce echipare are mașina ta.'

# (tipar in textul lor) -> (eticheta, textul NOSTRU)
# Ordinea conteaza: primul care se potriveste castiga.
RULES = [
    (r'fibr[aă]\s+optic',
     'Adaptor — sistem audio pe fibră optică',
     'Dacă mașina are sistemul audio pe fibră optică (amplificator sau magazie de CD-uri), '
     'montajul necesită un cablu adaptor de 6 m, care nu este inclus în pachet. ' + CONTACT_ADAPTOR),

    (r'amplificator\s+audio\s+sub\s+scaun',
     'Amplificator sub scaun — se anulează',
     'Dacă mașina are amplificatorul audio sub scaunul șoferului, acesta trebuie anulat la montaj. ' + CONTACT_VERIF),

    (r'rockford',
     'Adaptor — amplificator Rockford',
     'Dacă mașina are amplificator Rockford, montajul necesită un cablu adaptor, '
     'care nu este inclus în pachet. ' + CONTACT_ADAPTOR),

    (r'harman\s*kardon',
     'Blocant — sistem Harman Kardon',
     'Pe versiunile cu sistem audio Harman Kardon din fabrică montajul nu este posibil în configurația standard. ' + CONTACT_VERIF),

    (r'\binfinity\b',
     'Blocant — sistem Infinity',
     'Pe versiunile cu sistem audio Infinity din fabrică montajul nu este posibil în configurația standard. ' + CONTACT_VERIF),

    (r'sound\s*system',
     'Blocant — amplificator Sound System',
     'Pe versiunile cu amplificator Sound System din fabrică montajul nu este posibil în configurația standard. ' + CONTACT_VERIF),

    (r'camere?\s*360',
     'Adaptor — camere 360',
     'Dacă mașina are camere 360 din fabrică, montajul necesită un cablu suplimentar, '
     'care nu este inclus în pachet. ' + CONTACT_ADAPTOR),

    (r'plus\s+contact',
     'Adaptor — lipsă plus contact în mufa radioului',
     'Dacă mașina nu are plus contact în mufa de alimentare a radioului original, montajul necesită '
     'un cablu suplimentar, care nu este inclus în pachet. ' + CONTACT_ADAPTOR),

    (r'blaupunkt',
     'Modul climă — navigație Blaupunkt',
     'Dacă mașina are navigație originală Blaupunkt, montajul necesită un modul de control al '
     'aerului condiționat, care nu este inclus în pachet. ' + CONTACT_ADAPTOR),

    (r'buton(ul)?\s+de\s+avarii\s+p[aă]trat',
     'Blocant — buton de avarii pătrat',
     'Nu se montează pe versiunile cu butonul de avarii pătrat. '
     'Trimite-ne o poză a bordului înainte de comandă și confirmăm potrivirea.'),

    (r'amplificator\s+sau\s+naviga[tț]ie\s+original|naviga[tț]ie\s+original[aă]\s+sau\s+camer',
     'Adaptor — amplificator / navigație originală / cameră',
     'Dacă mașina are amplificator, navigație originală de fabrică sau cameră de marșarier, '
     'montajul necesită un cablu adaptor, care nu este inclus în pachet. ' + CONTACT_ADAPTOR),

    (r'pilot\s+automat\s+adaptiv',
     'Blocant — navigație de fabrică + pilot automat adaptiv',
     'Pe versiunile cu navigație de fabrică și pilot automat adaptiv montajul nu este posibil '
     'în configurația standard. ' + CONTACT_VERIF),

    (r'senzori\s+de\s+parcare',
     'Funcție limitată — senzori de parcare',
     'Dacă mașina are senzori de parcare din fabrică, aceștia sunt preluați doar vizual pe ecran, '
     'fără semnal acustic.'),

    (r'clima|aer\s+condi[tț]ionat',
     'Funcție limitată — afișaj climatizare',
     'Aerul condiționat rămâne controlabil din butoanele fizice ale mașinii, dar informațiile '
     'despre climatizare nu se afișează pe ecranul navigației.'),

    (r'ro[tț]ile?\s+de\s+reglare',
     'Fizic — rotile de reglare',
     'Dacă mașina are rotile de reglare sub grilele de ventilație, acestea trebuie demontate '
     'pentru montajul navigației.'),

    (r'decupe?ze|decupare',
     'Fizic — decupare în bord',
     'Pentru montaj este necesară decuparea unei porțiuni mici de plastic din interiorul bordului. '
     'Rama din pachet se lipește pe interior, iar rezultatul estetic rămâne curat.'),

    (r'butoanele\s+se\s+vor\s+reloca|butoanele\s+se\s+mut',
     'Fizic — butoane relocate',
     'Dacă mașina are încălzire în scaune, butoanele se mută în partea de jos a ramei adaptoare — '
     'rama are spațiu prevăzut pentru ele.'),

    (r'spa[tț]iu\s+gol',
     'Estetic — spațiu gol în bord',
     'Dacă mașina are ecran pe bord care afișează data și ora, după montaj rămâne un mic spațiu '
     'gol în spatele navigației.'),

    (r'aux\s+activat',
     'Interfață — cere AUX activat',
     'Pentru montaj mașina trebuie să aibă intrarea AUX activată. ' + CONTACT_VERIF),

    # ultimul: blocajul generic cu navigatia de fabrica
    (r'nu\s+se\s+poate\s+monta.*naviga[tț]ie\s+original',
     'Blocant la ei — navigație de fabrică (PROBABIL nu ni se aplică)',
     'ATENȚIE: la ei e blocant, dar noi vindem variante dedicate pentru mașini cu navigație de '
     'fabrică (CCC/CIC/NBT). Foarte probabil NU se aplică — de confirmat.'),
]
RULES = [(re.compile(p, re.I), lbl, txt) for p, lbl, txt in RULES]

BOSE_OK = re.compile(r'compatibil[aă]\s+[sș]i\s+cu\s+ma[sș]inile\s+cu\s+sistem\s+audio\s+bose', re.I)


def reformulate(raw):
    """(eticheta, textul nostru). Poate intoarce mai multe reguli concatenate."""
    hits = [(lbl, txt) for rx, lbl, txt in RULES if rx.search(raw)]
    if not hits:
        if BOSE_OK.search(raw):
            return 'Doar mențiune pozitivă (Bose OK)', ''
        return 'DE REFORMULAT MANUAL', ''
    labels = ' + '.join(l for l, _ in hits)
    text = ' '.join(dict.fromkeys(t for _, t in hits))   # fara duplicate, ordine pastrata
    return labels, text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--xlsx', action='store_true', default=True)
    ap.parse_args()

    harvest = [r for r in json.load(open(HARVEST, encoding='utf-8'))['results'] if r.get('limitari')]
    print(f'limitari recoltate: {len(harvest)} modele')

    cands = []
    for r in harvest:
        car, years = mcm.parse_group_key(r['modelLor'])
        cands.append((car, years, r))

    print('Descarc produsele...')
    products = al.fetch_all_products()
    rows = []
    for p in products:
        if p.get('category') not in al.NAV_CATEGORIES:
            continue
        car, y1, y2 = al.parse_product(p.get('name'))
        if not car:
            continue
        years = f'{y1}-{y2}' if y2 and y2 < 2099 else (f'dupa {y1}' if y1 else '')
        best = None
        for tcar, tyears, rec in cands:
            s, _ = mcm.score(car, years, tcar, tyears)
            if s > 0 and (best is None or s > best[0]):
                best = (s, rec)
        if not best:
            continue
        rec = best[1]
        label, our = reformulate(rec['limitari'])
        if not our:
            continue                        # mentiune pozitiva / nimic de publicat
        rows.append({
            'SKU': p.get('sku', ''),
            'Produs': p.get('name', ''),
            'Link produs': SITE + (p.get('slug') or ''),
            'Pret': p.get('price', ''),
            'Masina': car, 'Anii': years,
            'Tip limitare': label,
            'TEXTUL NOSTRU (de publicat)': our,
            'Se aplica?': '',
            'Observatii': '',
            'Textul lor (referinta)': rec['limitari'],
            'Sursa': rec['url'],
        })

    cols = ['SKU', 'Produs', 'Link produs', 'Pret', 'Masina', 'Anii', 'Tip limitare',
            'TEXTUL NOSTRU (de publicat)', 'Se aplica?', 'Observatii',
            'Textul lor (referinta)', 'Sursa']
    rows.sort(key=lambda r: (r['Tip limitare'], r['Masina'], r['Produs']))

    with open(CSV_OUT, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader(); w.writerows(rows)
    print(f'\nProduse afectate: {len(rows)}')
    print(f'Scris {CSV_OUT}')

    import collections
    for lbl, n in collections.Counter(r['Tip limitare'] for r in rows).most_common():
        print(f'  {n:5d}  {lbl[:78]}')

    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill
        wb = Workbook(); ws = wb.active; ws.title = 'Limitari produse'
        ws.append(cols)
        for c in ws[1]:
            c.font = Font(bold=True, color='FFFFFF')
            c.fill = PatternFill('solid', fgColor='4472C4')
            c.alignment = Alignment(vertical='center', wrap_text=True)
        for r in rows:
            ws.append([r[c] for c in cols])
        widths = {'A': 20, 'B': 52, 'C': 46, 'D': 8, 'E': 22, 'F': 12, 'G': 34,
                  'H': 72, 'I': 12, 'J': 24, 'K': 68, 'L': 46}
        for col, wd in widths.items():
            ws.column_dimensions[col].width = wd
        for row in ws.iter_rows(min_row=2):
            for idx in (6, 7, 10):
                row[idx].alignment = Alignment(wrap_text=True, vertical='top')
        ws.freeze_panes = 'A2'
        ws.auto_filter.ref = ws.dimensions
        wb.save(XLSX_OUT)
        print(f'Scris {XLSX_OUT}')
    except ImportError:
        print('openpyxl lipseste — doar CSV')


if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""Generează PDF-ul de verificare a prețurilor din price-check-report.json (reportlab)."""
import json, re
from collections import Counter, defaultdict

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                KeepTogether)

SRC = '/Users/alexmario/Desktop/site navigatii/backend/scripts/price-check-report.json'
OUT = '/Users/alexmario/Desktop/verificare-preturi-piloton.pdf'

pdfmetrics.registerFont(TTFont('Ar', '/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('ArB', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'))

INK = colors.HexColor('#1a2233')
MUT = colors.HexColor('#5a6472')
RED = colors.HexColor('#b3261e')
BLUE = colors.HexColor('#0b57d0')
ZEBRA = colors.HexColor('#f2f4f8')
LINE = colors.HexColor('#c8cedb')

r = json.load(open(SRC))
s = r['summary']
FAM_ORDER = ['2GB RK', '4GB RK', '4GB XT', '6GB XT', '4GB 8667', '8GB 8667',
             '4GB 8667 2K', '8GB 8667 2K', '12GB 2K']

st_title = ParagraphStyle('t', fontName='ArB', fontSize=19, leading=23, textColor=INK, spaceAfter=4)
st_sub = ParagraphStyle('s', fontName='Ar', fontSize=9, textColor=MUT, spaceAfter=10)
st_h2 = ParagraphStyle('h2', fontName='ArB', fontSize=13, textColor=INK,
                       spaceBefore=16, spaceAfter=6)
st_h3 = ParagraphStyle('h3', fontName='ArB', fontSize=10.5, textColor=INK,
                       spaceBefore=10, spaceAfter=3)
st_note = ParagraphStyle('n', fontName='Ar', fontSize=8.5, textColor=MUT, spaceAfter=5)
st_cell = ParagraphStyle('c', fontName='Ar', fontSize=8, leading=9.6, textColor=INK)
st_cellm = ParagraphStyle('cm', fontName='Ar', fontSize=7.5, leading=9, textColor=MUT)
st_li = ParagraphStyle('li', fontName='Ar', fontSize=9, leading=12, textColor=INK,
                       leftIndent=10, bulletIndent=2)

def P(t, st=st_cell): return Paragraph(t, st)

def fp(v):
    if v is None: return '—'
    v = float(v)
    t = f'{v:,.0f}' if v == int(v) else f'{v:,.2f}'
    return t.replace(',', '.')

def short_name(name): return re.sub(r'^Navigatie PilotOn\s+', '', name)

def excel_short(m):
    if 'excel' not in m: return 'grilă fixă OEM'
    lbl = re.sub(r'\s*\[.*?\]\s*$', '', m['excel'])
    lbl = re.sub(r'\(size (\d+), rama (\d+)(?:\.0)?\)', r'· \1" · ramă \2', lbl)
    return lbl + (' *' if m.get('note') else '')

story = []
story.append(Paragraph('Verificare prețuri PilotOn', st_title))
story.append(Paragraph(f'Generat {r["generated"]} — rame din „LISTA APARATE +RAME ACTUALIZATA 11.2025” — '
                       f'produse live de pe navi.piloton.ro', st_sub))

# ---- sumar „cards"
cards = [('produse verificabile', s['in_scope'], INK), ('preț corect', s['ok'], INK),
         ('preț greșit', s['mismatches'], RED), ('fără ramă în Excel', s['unmatched'], INK),
         ('în afara regulilor', s['unchecked'], INK)]
ct = Table([[Paragraph(f'<font name="ArB" size="16" color="{c.hexval()[2:] and "#"+c.hexval()[2:]}">{v}</font><br/>'
                       f'<font name="Ar" size="7" color="#5a6472">{lbl.upper()}</font>', st_cell)
             for (lbl, v, c) in cards]], colWidths=[37.2*mm]*5)
ct.setStyle(TableStyle([
    ('BOX', (0, 0), (0, 0), 0.7, LINE), ('BOX', (1, 0), (1, 0), 0.7, LINE),
    ('BOX', (2, 0), (2, 0), 0.7, LINE), ('BOX', (3, 0), (3, 0), 0.7, LINE),
    ('BOX', (4, 0), (4, 0), 0.7, LINE),
    ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 7),
]))
story.append(ct)
story.append(Spacer(1, 6))
story.append(Paragraph('Diferența = preț actual − preț corect: '
                       '<font color="#b3261e"><b>roșu = prea scump</b></font>, '
                       '<font color="#0b57d0"><b>albastru = prea ieftin</b></font>. '
                       '* = folosit rândul celeilalte diagonale (9"/10"), modelul există doar acolo.', st_note))

# ---------- 1. mismatches
by_fam = defaultdict(list)
for m in r['mismatches']: by_fam[m['family']].append(m)
fams = [f for f in FAM_ORDER if f in by_fam] + sorted(f for f in by_fam if f not in FAM_ORDER)

story.append(Paragraph(f"1. Prețuri greșite ({s['mismatches']} produse)", st_h2))
widths = [86*mm, 53*mm, 15*mm, 15*mm, 17*mm]
for fam in fams:
    rows = sorted(by_fam[fam], key=lambda m: m['name'])
    diffs = [m['diff'] for m in rows]
    data = [[P(f'<font name="ArB" color="white">{fam} — {len(rows)} produse '
               f'(dif. medie {sum(diffs)/len(diffs):+.0f} lei)</font>'), '', '', '', ''],
            [P('<font size="7" color="#5a6472">PRODUS</font>'),
             P('<font size="7" color="#5a6472">RÂND EXCEL / REGULĂ</font>'),
             P('<font size="7" color="#5a6472">ACTUAL</font>'),
             P('<font size="7" color="#5a6472">CORECT</font>'),
             P('<font size="7" color="#5a6472">DIF.</font>')]]
    styles = [
        ('SPAN', (0, 0), (-1, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), INK),
        ('LINEBELOW', (0, 1), (-1, 1), 1, colors.HexColor('#8a93a5')),
        ('ROWBACKGROUNDS', (0, 2), (-1, -1), [colors.white, ZEBRA]),
        ('ALIGN', (2, 1), (4, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    for i, m in enumerate(rows):
        d = m['diff']
        col = '#b3261e' if d > 0 else '#0b57d0'
        data.append([P(short_name(m['name'])), P(excel_short(m), st_cellm),
                     P(fp(m['price'])), P(fp(m['expected'])),
                     P(f'<font name="ArB" color="{col}">{d:+.0f}</font>')])
    t = Table(data, colWidths=widths, repeatRows=2)
    t.setStyle(TableStyle(styles))
    story.append(t)
    story.append(Spacer(1, 8))

# ---------- 2. unmatched
unm = defaultdict(lambda: {'n': 0, 'reason': '', 'prices': []})
for u in r['unmatched']:
    v = unm[u['model']]; v['n'] += 1; v['reason'] = u['reason']; v['prices'].append(u['price'])
missing = {k: v for k, v in unm.items() if 'niciun rând' in v['reason'] or 'nicio intrare' in v['reason']}
ambig = {k: v for k, v in unm.items() if k not in missing}

story.append(Paragraph(f"2. Fără rând de ramă în Excel ({s['unmatched']} produse)", st_h2))
story.append(Paragraph(f"2a. Modele care lipsesc din Excel — {sum(v['n'] for v in missing.values())} produse, "
                       f"{len(missing)} modele", st_h3))
story.append(Paragraph('Trebuie fie adăugat rândul în Excel, fie spus ce ramă folosesc.', st_note))
data = [[P('<font size="7" color="#5a6472">MODEL</font>'),
         P('<font size="7" color="#5a6472">PRODUSE</font>'),
         P('<font size="7" color="#5a6472">PREȚURI ACTUALE</font>')]]
for k in sorted(missing):
    v = missing[k]
    data.append([P(k), P(str(v['n'])), P(', '.join(fp(p) for p in sorted(set(v['prices']))), st_cellm)])
t = Table(data, colWidths=[80*mm, 16*mm, 90*mm], repeatRows=1)
t.setStyle(TableStyle([
    ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#8a93a5')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ZEBRA]),
    ('ALIGN', (1, 0), (1, -1), 'RIGHT'), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))
story.append(t)

story.append(Paragraph(f"2b. Ambigue — mai multe rame posibile în Excel — "
                       f"{sum(v['n'] for v in ambig.values())} produse, {len(ambig)} modele", st_h3))
story.append(Paragraph('Numele produsului nu spune varianta de ramă (LOW/HIGH, RAMA SIMPLA/CU BUTOANE…) '
                       'sau Excelul are rânduri duplicate cu prețuri diferite.', st_note))
data = [[P('<font size="7" color="#5a6472">MODEL</font>'),
         P('<font size="7" color="#5a6472">PRODUSE</font>'),
         P('<font size="7" color="#5a6472">MOTIV</font>')]]
for k in sorted(ambig):
    v = ambig[k]
    data.append([P(k), P(str(v['n'])), P(v['reason'], st_cellm)])
t = Table(data, colWidths=[60*mm, 16*mm, 110*mm], repeatRows=1)
t.setStyle(TableStyle([
    ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#8a93a5')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ZEBRA]),
    ('ALIGN', (1, 0), (1, -1), 'RIGHT'), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))
story.append(t)

# ---------- 3. probleme excel
dups = [w for w in r['warnings'] if w.startswith('Excel:')]
if dups:
    items = [Paragraph(f'•  {w[7:]}', st_li) for w in dups]
    story.append(KeepTogether([Paragraph(f'3. Probleme în Excel ({len(dups)})', st_h2)] + items))

# ---------- 4. unchecked
uc = Counter(u['reason'] for u in r['unchecked'])
data = [[P('<font size="7" color="#5a6472">MOTIV</font>'),
         P('<font size="7" color="#5a6472">PRODUSE</font>')]]
for reason, n in uc.most_common():
    data.append([P(reason), P(str(n))])
t = Table(data, colWidths=[150*mm, 20*mm], repeatRows=1)
t.setStyle(TableStyle([
    ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#8a93a5')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ZEBRA]),
    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))
story.append(KeepTogether([
    Paragraph(f"4. Produse în afara regulilor — neverificate ({s['unchecked']})", st_h2), t]))

# ---------- 5. presupuneri
items = [Paragraph(f'•  {a}', st_li) for a in r['assumptions']]
story.append(KeepTogether([Paragraph('5. Reguli și presupuneri folosite', st_h2)] + items))
story.append(Spacer(1, 8))
story.append(Paragraph('Raport generat de backend/scripts/checkPrices.py · '
                       'detalii complete în price-check-report.json', st_note))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Ar', 7.5)
    canvas.setFillColor(MUT)
    canvas.drawRightString(A4[0] - 12*mm, 8*mm, f'pag. {doc.page}')
    canvas.drawString(12*mm, 8*mm, 'Verificare prețuri PilotOn')
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=12*mm, rightMargin=12*mm,
                        topMargin=12*mm, bottomMargin=14*mm,
                        title='Verificare prețuri PilotOn')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print('PDF scris:', OUT)

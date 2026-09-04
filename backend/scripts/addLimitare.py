#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Adauga/actualizeaza o inregistrare in limitari-live-harvest.json.

  python3 backend/scripts/addLimitare.py <slug-model-lor> <url> [text|NONE]
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'limitari-live-harvest.json')
slug, url = sys.argv[1], sys.argv[2]
txt = sys.argv[3] if len(sys.argv) > 3 else 'NONE'
d = json.load(open(P, encoding='utf-8'))
rec = {'modelLor': slug, 'url': url, 'limitari': None if txt.strip().upper() == 'NONE' else txt.strip()}
d['results'] = [r for r in d['results'] if r['modelLor'] != slug] + [rec]
d['results'].sort(key=lambda r: r['modelLor'])
json.dump(d, open(P, 'w'), ensure_ascii=False, indent=1)
cu = sum(1 for r in d['results'] if r['limitari'])
print(f"{slug}: {'LIMITARE' if rec['limitari'] else 'fara'} | total {len(d['results'])} modele, {cu} cu limitari")

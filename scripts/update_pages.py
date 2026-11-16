#!/usr/bin/env python3
"""Setzt Zahlen und Stand-Datum in den Seiten aus data/stats.json.
Zahlen stehen als <span data-n="schluessel">1.234</span>, das Datum als <span data-stand>.
Einmalig: python scripts/update_pages.py --tag  (markiert passende Zahlen automatisch)"""
import json, re, sys, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fmt = lambda n: f"{n:,}".replace(',', '.')
stats = json.load(open(f'{ROOT}/data/stats.json'))
DS = stats['datasets']
d, m, y = stats['generated_at'][:10].split('-')[::-1][0], stats['generated_at'][5:7], stats['generated_at'][:4]
STAND = f"{d}.{m}.{y}"

def flat():
    out = {}
    def walk(k, v):
        if isinstance(v, dict):
            for a, b in v.items(): walk(f"{k}.{a}" if k else a, b)
        elif isinstance(v, int) and not isinstance(v, bool): out[k] = v
    walk('', DS)
    return out
F = flat()
pages = glob.glob(f'{ROOT}/*/index.html') + [f'{ROOT}/index.html']

def tag():
    by = {}
    for k, v in F.items():
        if v >= 1000: by.setdefault(fmt(v), []).append(k)
    for p in pages:
        t = open(p, encoding='utf-8').read()
        for n, keys in by.items():
            cnts = [k for k in keys if k.endswith('.count')]
            key = cnts[0] if cnts else (keys[0] if len(keys) == 1 else None)
            if key is None:
                if re.search(r'(?<![\d.>])' + re.escape(n) + r'(?![\d.<])', t): print('übersprungen (mehrdeutig):', p, n, keys)
                continue
            t = re.sub(r'(?<![\d.>])' + re.escape(n) + r'(?![\d.<])', f'<span data-n="{key}">{n}</span>', t)
        t = re.sub(r'Stand \d\d\.\d\d\.\d{4}', 'Stand <span data-stand>%s</span>' % STAND, t)
        t = re.sub(r'\((\d\d\.\d\d\.\d{4})\)</td>', r'(<span data-stand>\1</span>)</td>', t)
        t = re.sub(r'(Schnittstelle am )\d\d\.\d\d\.\d{4}', r'\1<span data-stand>%s</span>' % STAND, t)
        open(p, 'w', encoding='utf-8').write(t)

def update():
    n_changed = 0
    for p in pages:
        t = open(p, encoding='utf-8').read(); o = t
        def r(mo):
            v = F.get(mo.group(1))
            return mo.group(0) if v is None else f'<span data-n="{mo.group(1)}">{fmt(v)}</span>'
        t = re.sub(r'<span data-n="([^"]+)">[^<]*</span>', r, t)
        t = re.sub(r'<span data-stand>[^<]*</span>', f'<span data-stand>{STAND}</span>', t)
        if t != o: open(p, 'w', encoding='utf-8').write(t); n_changed += 1
    print('Seiten geändert:', n_changed)

if '--tag' in sys.argv: tag()
update()

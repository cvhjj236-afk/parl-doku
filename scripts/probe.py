#!/usr/bin/env python3
"""Wöchentliche Prüfung der Open-Data-Schnittstelle des Parlaments (inoffiziell).

Schreibt data/stats.json (aktueller Stand), data/history.jsonl (Zählerverlauf)
und data/changes.md (Änderungen seit dem letzten Lauf).
Höflich: ein Request nach dem anderen, Pause, Backoff, eigener User-Agent.
"""
import json, os, sys, time, datetime, urllib.request, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
B = 'https://www.parlament.gv.at/Filter/api/'
UA = 'parl-doku-monitor/1.0 (+https://parl-doku.hoferbaut.fyi; inoffiziell, woechentlich)'
PAUSE = 1.0
CAP = 100000          # beobachtete Obergrenze der Zeilen pro showAll-Antwort
LATEST_GPS = ['XXVII', 'XXVIII']   # für große Datensätze nur diese GPs vollständig laden
BIG_LIMIT = 30000     # ab dieser Trefferzahl nur die letzten GPs laden

def f101(extra=''): return B + 'filter/data/101?js=eval' + extra
SPECS = [
 # key, label, slug, url-Basis (ohne showAll), body, hat GP_CODE
 ('sa_nr','Anfragen NR','schriftliche-anfragen',f101,{"NRBR":["NR"],"VHG":["J_JPR_M"]},True),
 ('sa_br','Anfragen BR','schriftliche-anfragen',f101,{"NRBR":["BR"],"VHG":["J_JPR_M-BR"]},True),
 ('rv','Regierungsvorlagen','regierungsvorlagen',f101,{"NRBR":["NR"],"VHG":["RV"]},True),
 ('antr_nr','Anträge NR','antraege',f101,{"NRBR":["NR"],"VHG":["ANTR"]},True),
 ('antr_br','Anträge BR','antraege',f101,{"NRBR":["BR"],"VHG":["ANTR-BR"]},True),
 ('gabr','Gesetzesanträge BR','gesetzesantraege-br',f101,{"NRBR":["NR"],"VHG":["GABR","GABR13"]},True),
 ('aub_nr','Ausschussberichte NR','ausschussberichte',f101,{"NRBR":["NR"],"VHG":["AUB"]},True),
 ('aub_br','Ausschussberichte BR','ausschussberichte',f101,{"NRBR":["BR"],"VHG":["AUB-BR"]},True),
 ('bnr','Beschlüsse','beschluesse',f101,{"VHG":["BNR"]},True),
 ('bi','Bürgerinitiativen','buergerinitiativen',f101,{"NRBR":["NR"],"VHG":["BI"]},True),
 ('pet','Petitionen','petitionen',f101,{"NRBR":["NR"],"VHG":["PET"]},True),
 ('eu_all','EU-Vorlagen gesamt','referenz',f101,{"VHG":["EU"]},True),
 ('eu_s','EU Hauptausschuss (S)','eu-stellungnahmen-hauptausschuss',f101,{"NRBR":["NR"],"VHG":["EU"],"VHG2":["S"]},True),
 ('eu_mteu','EU Unterausschuss Mitteilungen (MTEU)','eu-mitteilungen-unterausschuss',f101,{"NRBR":["NR"],"VHG":["EU"],"VHG2":["MTEU"]},True),
 ('eu_seu','EU Unterausschuss Stellungnahmen (SEU)','eu-stellungnahmen-unterausschuss',f101,{"NRBR":["NR"],"VHG":["EU"],"VHG2":["SEU"]},True),
 ('eu_sbbr','EU BR begründete (SB-BR)','eu-begruendete-stellungnahmen-br',f101,{"NRBR":["BR"],"VHG":["EU"],"VHG2":["SB-BR"]},True),
 ('eu_mtbr','EU BR Mitteilungen (MT-BR)','eu-mitteilungen-br',f101,{"NRBR":["BR"],"VHG":["EU"],"VHG2":["MT-BR"]},True),
 ('eu_sbr','EU BR Stellungnahmen (S-BR)','eu-stellungnahmen-br',f101,{"NRBR":["BR"],"VHG":["EU"],"VHG2":["S-BR"]},True),
 ('beteiligungen','Aktuelle Beteiligungen','beteiligungen',lambda e='':B+'filter/data/143?js=eval'+e,{"AKTIV":["J"]},False),
 ('protokolle','Stenographische Protokolle','protokolle',lambda e='':B+'filter/data/211?js=eval'+e,{"NBVS":["NRSITZ","BRSITZ"]},False),
 ('plenar_nr','Plenarsitzungen NR (XXVIII)','plenarsitzungen',lambda e='':B+'json/post?jsMode=EVAL&FBEZ=WFP_007&listeId=11070'+e,{"NRBRBV":["NR"],"GP":["XXVIII"]},False),
 ('plenar_br','Plenarsitzungen BR (XXVIII)','plenarsitzungen',lambda e='':B+'json/post?jsMode=EVAL&FBEZ=WFP_007&listeId=11070'+e,{"NRBRBV":["BR"],"GP":["XXVIII"]},False),
 ('parlamentarier','Parlamentarier:innen seit 1918','parlamentarier',lambda e='':B+'filter/data/409?1=1&export=true'+e,{},False),
 ('abgeordnete','Aktuelle Abgeordnete NR','abgeordnete-nr',lambda e='':B+'json/post?jsMode=EVAL&FBEZ=WFW_002&listeId=10002'+e,{"M":["M"],"W":["W"]},False),
 ('mitglieder_br','Aktuelle Mitglieder BR','mitglieder-br',lambda e='':B+'json/post?jsMode=EVAL&FBEZ=WFW_005&listeId=10005'+e,{"M":["M"],"W":["W"]},False),
 ('korrespondenz','Parlamentskorrespondenz','parlamentskorrespondenz',lambda e='':B+'filter/data/110?js=eval'+e,{},False),
 ('termine','Termine','termine',lambda e='':B+'filter/data/600?js=eval'+e,{},False),
 ('ausschuesse','Ausschüsse','ausschuesse',lambda e='':B+'filter/data/2008?1=1&export=true'+e,{},False),
]
# Erwartete "Stolpersteine": ('zero' = muss 0 Treffer liefern, 'nonzero' = muss Treffer liefern)
CANARIES = [
 ('antr_br_falsch','Anträge BR mit VHG=ANTR (richtig: ANTR-BR)',f101,{"NRBR":["BR"],"VHG":["ANTR"]},'zero'),
 ('gabr_br_falsch','Gesetzesanträge mit NRBR=BR (richtig: NR)',f101,{"NRBR":["BR"],"VHG":["GABR"]},'zero'),
 ('aub_br_falsch','Ausschussberichte BR mit VHG=AUB (richtig: AUB-BR)',f101,{"NRBR":["BR"],"VHG":["AUB"]},'zero'),
 ('bi_br','Bürgerinitiativen im BR',f101,{"NRBR":["BR"],"VHG":["BI"]},'zero'),
 ('pet_br','Petitionen im BR',f101,{"NRBR":["BR"],"VHG":["PET"]},'zero'),
 ('eu_mtbr_falsch','EU-Mitteilungen BR mit MTEU-BR (richtig: MT-BR)',f101,{"NRBR":["BR"],"VHG":["EU"],"VHG2":["MTEU-BR"]},'zero'),
 ('eu_s_br','EU Hauptausschuss S im BR',f101,{"NRBR":["BR"],"VHG":["EU"],"VHG2":["S"]},'zero'),
]
LABELS = {'GP':'GP_CODE','DOKTYP':'DOKTYP','VHG2':'VHG2','Status':'Status','NRBR':'NRBR'}

def log(*a): print(*a, file=sys.stderr, flush=True)

def post(url, body):
    last = None
    for wait in (0, 5, 15, 45):
        if wait: time.sleep(wait)
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type':'application/json','User-Agent':UA})
            with urllib.request.urlopen(req, timeout=300) as r:
                d = json.loads(r.read())
            time.sleep(PAUSE)
            return d
        except Exception as e:
            last = e; log('  Fehler', str(e)[:80], 'url', url[:80])
    raise last

def labels(d):
    return [ (h.get('label') if isinstance(h, dict) else h) for h in d.get('header', []) ]

def probe(spec):
    key, label, slug, urlf, body, has_gp = spec
    out = {'label': label, 'slug': slug, 'ok': False}
    try:
        d = post(urlf(''), body)            # ohne showAll: nur Zähler, 20 Zeilen
    except Exception as e:
        out['error'] = str(e)[:200]; return out
    if 'errorMsg' in d:
        out['error'] = 'errorMsg'; return out
    out['count'] = d.get('count'); out['pages_without_showall'] = d.get('pages')
    out['last_sync'] = d.get('lastSync'); out['columns'] = len(d.get('header', []))
    out['ok'] = True
    cnt = d.get('count') or 0
    if cnt == 0 or not has_gp:
        return out
    # Verteilung: kleine Datensätze komplett, große nur letzte GPs
    bodies = [(body, None)]
    if cnt > BIG_LIMIT:
        bodies = [(dict(body, GP_CODE=[g]), g) for g in LATEST_GPS]
        out['distribution_scope'] = 'nur ' + ', '.join(LATEST_GPS)
    dist = {k: collections.Counter() for k in ('GP','DOKTYP','VHG2','Status')}
    rows_total = 0
    for b, g in bodies:
        full = post(urlf('&showAll=true'), b)
        rows = full.get('rows', [])
        rows_total += len(rows)
        if len(rows) >= CAP or (full.get('count') or 0) > len(rows):
            out['capped'] = True
        ix = {l: i for i, l in enumerate(labels(full))}
        for k in dist:
            col = LABELS[k]
            if col in ix:
                dist[k].update((r[ix[col]] if len(r) > ix[col] else None) for r in rows)
    out['distribution'] = {k: dict(sorted(v.items(), key=lambda kv: (-kv[1], str(kv[0])))) for k, v in dist.items() if v}
    return out

def canary(c):
    key, label, urlf, body, expect = c
    try:
        d = post(urlf(''), body)
        n = d.get('count', 0) if 'errorMsg' not in d else None
    except Exception as e:
        return {'label': label, 'expect': expect, 'count': None, 'status': 'fehler'}
    st = 'ok' if ((expect == 'zero' and n == 0) or (expect == 'nonzero' and n)) else 'abweichung'
    return {'label': label, 'expect': expect, 'count': n, 'status': st}

def abg_check():
    """NR-Abgeordnete: ohne M/W muss eine Fehlermeldung kommen."""
    d = post(B + 'json/post?jsMode=EVAL&FBEZ=WFW_002&listeId=10002&showAll=true', {})
    return {'label': 'Abgeordnete NR ohne M/W liefern errorMsg', 'expect': 'errorMsg', 'count': None, 'status': 'ok' if 'errorMsg' in d else 'abweichung'}

def main():
    os.makedirs(DATA, exist_ok=True)
    prev = {}
    p = os.path.join(DATA, 'stats.json')
    if os.path.exists(p):
        prev = json.load(open(p, encoding='utf-8'))
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    stats = {'generated_at': now, 'datasets': {}, 'canaries': {}, 'limits': {'showall_row_cap': CAP}}
    for s in SPECS:
        log('Datensatz', s[0]); stats['datasets'][s[0]] = probe(s)
    for c in CANARIES:
        log('Canary', c[0]); stats['canaries'][c[0]] = canary(c)
    stats['canaries']['abg_ohne_mw'] = abg_check()
    json.dump(stats, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    with open(os.path.join(DATA, 'history.jsonl'), 'a', encoding='utf-8') as h:
        h.write(json.dumps({'at': now, 'counts': {k: v.get('count') for k, v in stats['datasets'].items()}}, ensure_ascii=False) + '\n')
    # Änderungsbericht
    L = ['# Änderungen seit dem letzten Lauf', '', 'Lauf: %s (vorher: %s)' % (now, prev.get('generated_at', 'kein früherer Lauf')), '']
    issues = []
    for k, v in stats['datasets'].items():
        o = prev.get('datasets', {}).get(k, {})
        if not v.get('ok'): issues.append('**%s**: Abruf fehlgeschlagen (%s)' % (v['label'], v.get('error')))
        if v.get('capped'): issues.append('**%s**: Antwort an der %d-Zeilen-Grenze abgeschnitten' % (v['label'], CAP))
        if o.get('columns') is not None and o.get('columns') != v.get('columns'): issues.append('**%s**: Spaltenzahl %s → %s' % (v['label'], o.get('columns'), v.get('columns')))
        for dim in ('DOKTYP', 'VHG2', 'Status'):
            a = set((o.get('distribution') or {}).get(dim, {})); b = set((v.get('distribution') or {}).get(dim, {}))
            if o and (b - a): issues.append('**%s**: neue %s-Werte %s' % (v['label'], dim, sorted(map(str, b - a))))
            if o and (a - b) and not v.get('distribution_scope'): issues.append('**%s**: %s-Werte verschwunden %s' % (v['label'], dim, sorted(map(str, a - b))))
        if o.get('count') is not None and v.get('count') is not None and o['count'] != v['count']:
            L.append('- %s: %s → %s (%+d)' % (v['label'], o['count'], v['count'], v['count'] - o['count']))
    for k, c in stats['canaries'].items():
        if c['status'] != 'ok': issues.append('**Stolperstein geändert**: %s (erwartet %s, Ergebnis %s)' % (c['label'], c['expect'], c.get('count')))
    L.append('')
    L.append('## Auffälligkeiten' if issues else '## Keine Auffälligkeiten')
    L += ['- ' + i for i in issues]
    open(os.path.join(DATA, 'changes.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    stats['issues'] = issues
    json.dump(stats, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    log('fertig,', len(issues), 'Auffälligkeiten')
    return 0

if __name__ == '__main__':
    sys.exit(main())

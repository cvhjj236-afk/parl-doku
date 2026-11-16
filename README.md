# parl-doku

Inoffizielle API-Doku zu den Open-Data-Schnittstellen des österreichischen Parlaments (nicht vom Parlament).

Live: https://parl-doku.hoferbaut.fyi

## Seiten
- `/` Übersicht
- `/schriftliche-anfragen/` NR und BR
- `/regierungsvorlagen/`
- `/antraege/` NR und BR
- `/gesetzesantraege-br/`
- `/ausschussberichte/`, `/beschluesse/`, `/beteiligungen/`
- `/buergerinitiativen/`, `/petitionen/`, `/protokolle/`, `/plenarsitzungen/`, `/parlamentarier/`, `/abgeordnete-nr/`
- `/mitglieder-br/`, `/parlamentskorrespondenz/`, `/termine/`, `/ausschuesse/`, `/ausschussmitgliedschaften/` und sechs `/eu-…/`-Seiten (alle 25 Datensätze der Parlaments-Doku)
- `/referenz/` Antwortaufbau und 36 Spalten
- `openapi.yaml` (OpenAPI 3.0.3), `llms.txt`

## Technik
Statische Seiten ohne Build-Schritt, Ausgabeordner ist das Wurzelverzeichnis. Hosting über Cloudflare Pages, Deployment automatisch bei Push auf `main`.

Daten: Parlament Österreich, CC BY 4.0.

## Wöchentliche Prüfung
`.github/workflows/weekly.yml` startet montags `scripts/probe.py`. Das Skript fragt alle Datensätze (zuerst nur den Zähler, dann bei kleineren Datensätzen die Verteilung von `DOKTYP`, `VHG2`, `Status`, GP) und prüft bekannte Stolpersteine, etwa dass `VHG=ANTR` im BR weiterhin 0 Treffer liefert. Ergebnisse:
- `data/stats.json`: aktueller Stand (wird als Live-Banner auf den Seiten angezeigt)
- `data/history.jsonl`: Zählerverlauf
- `data/changes.md`: Änderungen und Auffälligkeiten seit dem letzten Lauf

Manuell starten: `python scripts/probe.py` oder in GitHub unter Actions „Wöchentliche Prüfung“ → Run workflow.

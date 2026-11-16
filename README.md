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
- `/referenz/` Antwortaufbau und 36 Spalten
- `openapi.yaml` (OpenAPI 3.0.3), `llms.txt`

## Technik
Statische Seiten ohne Build-Schritt, Ausgabeordner ist das Wurzelverzeichnis. Hosting über Cloudflare Pages, Deployment automatisch bei Push auf `main`.

Daten: Parlament Österreich, CC BY 4.0.

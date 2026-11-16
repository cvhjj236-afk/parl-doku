# parl-doku

Inoffizielle API-Doku zu den schriftlichen Anfragen (NR und BR) des österreichischen Parlaments.

- `index.html`: Doku-Seite (statisch, ohne Build)
- `openapi.yaml`: OpenAPI 3.0.3
- `llms.txt`: Kurzbeschreibung für KI-Crawler

Hosting: Cloudflare Pages, Domain `parl-doku.hoferbaut.fyi`. Kein Build-Schritt, Ausgabeordner ist das Wurzelverzeichnis.
Daten: Parlament Österreich, CC BY 4.0.

Live: https://parl-doku.hoferbaut.fyi

Deployment: automatisch über Cloudflare Pages bei Push auf main.

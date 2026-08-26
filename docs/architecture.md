# Architektur

## Überblick

Das Projekt ist eine statische GitHub-Pages-Website ohne Build-Schritt. Jede Seite besitzt eine eigene `index.html` und wird direkt vom Browser ausgeführt.

## Seiten

| Pfad | Aufgabe |
| --- | --- |
| `/` | Persönlicher Hub und zentrale Übersicht |
| `/finanzenpaul/` | Persönliche Finanzübersicht |
| `/kalenderpaul/` | Kalenderübersicht |

Eine neue Reiseseite ist vorgesehen, aber noch nicht Bestandteil dieses Repositories. Die entsprechende Fläche auf dem Hub ist bis dahin nicht verlinkt.

## Verzeichnisse

- `assets/` enthält gemeinsame statische Ressourcen.
- `data/` enthält öffentlich ausgelieferte JSON-Daten für den Hub.
- `scripts/` erzeugt oder aktualisiert diese JSON-Dateien.
- `.github/workflows/` führt ausgewählte Aktualisierungsskripte automatisch aus.
- `workers/kalender-proxy/` enthält den Cloudflare-Worker für geschützte Kalenderquellen, Snapshots und Horoskopdaten.
- `docs/` enthält die technische Projektdokumentation.

## Statische Ressourcen

Der Hub ist bereits nach Verantwortlichkeiten aufgeteilt:

- `assets/css/hub.css` enthält das Hub-Design.
- `assets/js/hub.js` enthält die allgemeine Hub-Logik.
- `assets/js/hub-alcohol.js` enthält den Alkohol-Tracker und seine Diagrammlogik.
- Das kleine Theme-Skript bleibt im Dokumentkopf, damit das gespeicherte Farbschema vor dem ersten Rendering angewendet wird.

Die Finanzseite ist ebenfalls aufgeteilt:

- `finanzenpaul/assets/css/app.css` enthält das Design der Finanzseite.
- `finanzenpaul/assets/js/app.js` enthält ihre Anwendungslogik.

Der Kalender ist ebenfalls aufgeteilt:

- `kalenderpaul/assets/css/app.css` enthält das Kalenderdesign.
- `kalenderpaul/assets/js/app.js` enthält die Kalender- und Datenquellenlogik.

Der Kalender-Proxy akzeptiert neben der GitHub-Pages-Domain auch die dokumentierten lokalen Entwicklungs-Origins. Die persönlichen Datenflüsse werden lokal und zusätzlich nach jedem Deployment auf der GitHub-Pages-Domain geprüft.

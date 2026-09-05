# Architektur

## Überblick

Das Projekt ist eine statische GitHub-Pages-Website ohne Build-Schritt. Jede Seite besitzt eine eigene `index.html` und wird direkt vom Browser ausgeführt.

## Seiten

| Pfad | Aufgabe |
| --- | --- |
| `/` | Persönlicher Hub und zentrale Übersicht |
| `/finanzenpaul/` | Persönliche Finanzübersicht |
| `/kalenderpaul/` | Kalenderübersicht |

Die Reisefläche des Hubs verlinkt auf die eigenständige Anwendung TrailYX. Eine
kleine geschützte Vorschau wird nach Hub-Anmeldung über den privaten Gateway und
ein Service Binding geladen; TrailYX selbst bleibt ein separates Repository.

## Verzeichnisse

- `assets/` enthält gemeinsame statische Ressourcen.
- `data/` enthält öffentlich ausgelieferte JSON-Daten für den Hub.
- `scripts/` erzeugt oder aktualisiert diese JSON-Dateien.
- `.github/workflows/` führt ausgewählte Aktualisierungsskripte automatisch aus.
- `workers/private-gateway/` enthält den einzigen öffentlichen Cloudflare-Einstiegspunkt mit Google-Authentifizierung und verwaltet die privaten Alkohol-Tracker-Daten über ein D1-Binding.
- `workers/kalender-proxy/` enthält das nicht öffentlich erreichbare Backend für Kalenderquellen, Snapshots, Horoskop- und Marktdaten.
- `docs/` enthält die technische Projektdokumentation.

Das vollständige Register externer Datenflüsse, Zugriffsarten und Sicherheitsmaßnahmen steht in [`interfaces.md`](interfaces.md). Die gemeinsame Browser-Anmeldung wird nach einmaliger Google-Prüfung als widerrufbare 30-Tage-Sitzung geführt. Der Browser speichert das zufällige Sitzungstoken dauerhaft; D1 enthält nur dessen SHA-256-Hash und Ablaufzeit. Kurzlebige Google-Tokens für direkte Kalender-Schreibzugriffe bleiben davon getrennt und werden nur für die Browsersitzung gehalten.

## Statische Ressourcen

Der Hub ist bereits nach Verantwortlichkeiten aufgeteilt:

- `assets/css/hub.css` enthält das Hub-Design.
- `assets/js/hub.js` enthält die allgemeine Hub-Logik.
- `assets/js/hub-alcohol.js` enthält den Alkohol-Tracker und seine Diagrammlogik; Daten werden nur im Arbeitsspeicher gehalten und authentifiziert aus D1 geladen.
- Das kleine Theme-Skript bleibt im Dokumentkopf, damit das gespeicherte Farbschema vor dem ersten Rendering angewendet wird.

Die Finanzseite ist ebenfalls aufgeteilt:

- `finanzenpaul/assets/css/app.css` enthält das Design der Finanzseite.
- `finanzenpaul/assets/js/app.js` enthält ihre Anwendungslogik.

Der Kalender ist ebenfalls aufgeteilt:

- `kalenderpaul/assets/css/app.css` enthält das Kalenderdesign.
- `kalenderpaul/assets/js/app.js` enthält die Kalender- und Datenquellenlogik.

Der öffentliche Gateway akzeptiert neben der GitHub-Pages-Domain auch die dokumentierten lokalen Entwicklungs-Origins. Das Frontend verwendet für private Pfade eine gültige, serverseitig gespeicherte Hub-Sitzung des freigegebenen Kontos. Direkte Google-OAuth-Tokens bleiben während der Migration kompatibel und dienen insbesondere zum Erstellen einer Sitzung. Der Gateway authentifiziert das ausschließlich per Service Binding erreichbare Backend zusätzlich mit einem gemeinsamen internen Secret; Browser-Authorization-Header werden nicht weitergereicht. Die persönlichen Datenflüsse werden lokal und zusätzlich nach jedem Deployment auf der GitHub-Pages-Domain geprüft.

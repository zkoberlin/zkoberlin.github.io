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
- `docs/` enthält die technische Projektdokumentation.

## Statische Ressourcen

Der Hub ist bereits nach Verantwortlichkeiten aufgeteilt:

- `assets/css/hub.css` enthält das Hub-Design.
- `assets/js/hub.js` enthält die allgemeine Hub-Logik.
- `assets/js/hub-alcohol.js` enthält den Alkohol-Tracker und seine Diagrammlogik.
- Das kleine Theme-Skript bleibt im Dokumentkopf, damit das gespeicherte Farbschema vor dem ersten Rendering angewendet wird.

Finanzen und Kalender enthalten CSS und JavaScript derzeit noch direkt in ihren HTML-Dateien. Sie werden als eigene, separat prüfbare Schritte ausgelagert.

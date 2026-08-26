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

## Nächster technischer Schritt

CSS und JavaScript befinden sich aktuell größtenteils direkt in den HTML-Dateien. Sie werden später kontrolliert und Seite für Seite in die vorgesehenen `assets/`-Ordner ausgelagert.

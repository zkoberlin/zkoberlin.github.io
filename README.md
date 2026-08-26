# Pauls persönlicher Web-Hub

Dieses Repository enthält den statischen Web-Hub unter `zkoberlin.github.io` und seine beiden Unterseiten:

- `finanzenpaul/` – persönliche Finanzübersicht
- `kalenderpaul/` – Kalenderübersicht

Die Website wird direkt über GitHub Pages ausgeliefert. Es gibt derzeit kein Build-System; HTML, CSS und JavaScript laufen direkt im Browser.

## Lokal starten

1. Repository in Visual Studio Code öffnen.
2. `Terminal > Run Task > Website lokal starten` auswählen.
3. Im Browser `http://localhost:8000` öffnen.

Alternativ im Terminal:

```bash
python3 -m http.server 8000
```

## Projektbereiche

```text
index.html          Hauptseite des Hubs
finanzenpaul/       Finanz-Unterseite
kalenderpaul/       Kalender-Unterseite
assets/             Gemeinsame Styles, Skripte und Bilder
data/               Vom Hub verwendete JSON-Daten
scripts/            Skripte zur Aktualisierung der JSON-Daten
docs/               Technische Projektdokumentation
.github/workflows/  Automatische Datenaktualisierungen
```

Weiterführende Dokumentation:

- [Entwicklung](docs/development.md)
- [Architektur](docs/architecture.md)
- [Datenquellen](docs/data-sources.md)
- [Deployment](docs/deployment.md)

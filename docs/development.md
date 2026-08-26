# Lokale Entwicklung

## Voraussetzungen

- Git
- Visual Studio Code
- Python 3

Für die Website selbst müssen keine Pakete installiert werden. Die Python-Skripte verwenden derzeit nur Module aus der Python-Standardbibliothek.

## Projekt öffnen

```bash
code /Users/paulbendzko/Documents/GitHub/zkoberlin.github.io
```

## Lokalen Webserver starten

In Visual Studio Code:

1. `Terminal > Run Task` öffnen.
2. `Website lokal starten` auswählen.
3. `http://localhost:8000` im Browser öffnen.

Alternativ:

```bash
python3 -m http.server 8000
```

Ein lokaler Webserver ist erforderlich, weil Browser lokale `fetch()`-Zugriffe auf JSON-Dateien bei direktem Öffnen über `file://` blockieren können.

## Vor einem Commit prüfen

```bash
git diff --check
python3 -m compileall -q scripts
```

Danach Hauptseite, Finanzen und Kalender mindestens einmal lokal öffnen und die Browser-Konsole auf Fehler prüfen.

## Formatierung

Automatisches Formatieren beim Speichern ist zunächst deaktiviert, damit die großen bestehenden HTML-Dateien nicht unbeabsichtigt vollständig umformatiert werden.

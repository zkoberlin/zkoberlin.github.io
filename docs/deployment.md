# Deployment

## GitHub Pages

Die Website wird direkt aus dem Repository veröffentlicht. Da kein Build-System vorhanden ist, werden die eingecheckten HTML-, CSS-, JavaScript-, Bild- und JSON-Dateien unverändert ausgeliefert.

## Veröffentlichung

1. Änderungen lokal prüfen.
2. `git diff` und `git status` kontrollieren.
3. Änderungen committen und nach GitHub pushen.
4. Warten, bis GitHub Pages die neue Version veröffentlicht hat.
5. Hub sowie beide Unterseiten in der veröffentlichten Umgebung prüfen.

## Pfade

Absolute Pfade wie `/finanzenpaul/` beziehen sich auf die Domainwurzel. Relative Pfade innerhalb einer Unterseite müssen bei einer späteren Dateiaufteilung besonders sorgfältig angepasst werden.

## Automatische Datenaktualisierung

Die GitHub Actions unter `.github/workflows/` aktualisieren einzelne JSON-Dateien unabhängig vom Website-Deployment und committen Änderungen zurück in das Repository.

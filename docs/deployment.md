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

## Cloudflare Worker

- `paul-gateway-v2` ist der öffentliche Einstiegspunkt für Hub und KalenderPaul.
- `kalender-proxy` ist mit `workers_dev: false` nicht direkt öffentlich erreichbar.
- Der Gateway greift über das Service Binding `BACKEND` auf `kalender-proxy` zu.
- Dashboard-Secrets werden bei Deployments mit `wrangler deploy --keep-vars` bewahrt.

Nach Änderungen an einem Worker werden mindestens ein öffentlicher Pfad (`200`), ein privater Pfad ohne Token (`401`) und der veröffentlichte angemeldete Browserfluss geprüft.

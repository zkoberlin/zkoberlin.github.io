# Datenquellen

Die Dateien in `data/` werden öffentlich über GitHub Pages ausgeliefert. Dort dürfen deshalb keine Passwörter, Tokens oder privaten Rohdaten gespeichert werden.

| Datei | Aktualisierung |
| --- | --- |
| `geburtstage.json` | `scripts/fetch_geburtstage.py` und GitHub Action |
| `namenstage.json` | `scripts/fetch_namenstage.py` und GitHub Action |
| `schulferien_berlin.json` | `scripts/fetch_schulferien.py` und GitHub Action |
| `transfers.json` | `scripts/fetch_transfers.py`; Automation derzeit saisonal pausiert |
| `union.json` | `scripts/fetch_union.py` und GitHub Action |
| `special-days.json` | Validierte statische Projektdaten (Schema v2); bewegliche Hinweise werden im Frontend berechnet |

Die frühere Datei `reiselog.json` und ihre Aktualisierungspipeline wurden entfernt. Eine neue Reiseseite und ihre Datenanbindung werden später separat geplant.

## Aktualisierung

Die Workflows unter `.github/workflows/` können über GitHub Actions manuell gestartet werden. Zeitpläne und erforderliche Secrets sind jeweils im zugehörigen Workflow definiert.

Secrets gehören ausschließlich in die GitHub-Repository-Secrets oder in lokale, von Git ignorierte `.env`-Dateien. Sie dürfen niemals in HTML, JSON, Dokumentation oder Git-Commits geschrieben werden.

Private Kalender-Feed-Adressen werden als verschlüsselte Secrets des Workers `kalender-proxy` verwaltet. Das Frontend verwendet ausschließlich benannte Worker-Endpunkte und enthält nach abgeschlossener Migration keine privaten Feed-URLs mehr.

Alle Browser-, Worker- und Automationsschnittstellen einschließlich ihrer Sicherheitsbewertung sind in [`interfaces.md`](interfaces.md) erfasst.

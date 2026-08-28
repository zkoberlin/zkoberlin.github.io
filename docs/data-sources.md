# Datenquellen

Die Dateien in `data/` werden öffentlich über GitHub Pages ausgeliefert. Dort dürfen deshalb keine Passwörter, Tokens oder privaten Rohdaten gespeichert werden.

| Datei | Aktualisierung |
| --- | --- |
| `geburtstage.json` | `scripts/fetch_geburtstage.py` und GitHub Action |
| `feiertage_berlin.json` | `scripts/fetch_feiertage_berlin.py`; aktuelles und folgendes Jahr, monatliche/manuelle GitHub Action |
| `namenstage.json` | Versionierte, vollständig validierte Jahresdatei. Aktuell redaktioneller Grundbestand; monatliche/manuelle GitHub Action ersetzt ihn erst nach 366 erfolgreichen Abalin-V2-Antworten. |
| `schulferien_berlin.json` | `scripts/fetch_schulferien.py`; versioniertes, vollständig validiertes Schema für Berlin und aktuelles plus folgendes Jahr; monatliche/manuelle GitHub Action |
| `transfers.json` | `scripts/fetch_transfers.py`; Automation derzeit saisonal pausiert |
| `union.json` | `scripts/fetch_union_openliga.py` und tägliche GitHub Action; validierter und atomar ersetzter OpenLigaDB-Snapshot |
| `special-days.json` | Validierte statische Projektdaten (Schema v2); bewegliche Hinweise werden im Frontend berechnet |

Die frühere Datei `reiselog.json` und ihre Aktualisierungspipeline wurden entfernt. Eine neue Reiseseite und ihre Datenanbindung werden später separat geplant.

## Aktualisierung

Die Workflows unter `.github/workflows/` können über GitHub Actions manuell gestartet werden. Zeitpläne und erforderliche Secrets sind jeweils im zugehörigen Workflow definiert.

Secrets gehören ausschließlich in die GitHub-Repository-Secrets oder in lokale, von Git ignorierte `.env`-Dateien. Sie dürfen niemals in HTML, JSON, Dokumentation oder Git-Commits geschrieben werden.

Private Kalender-Feed-Adressen werden als verschlüsselte Secrets des Workers `kalender-proxy` verwaltet. Das Frontend verwendet ausschließlich benannte Worker-Endpunkte und enthält nach abgeschlossener Migration keine privaten Feed-URLs mehr.

Alle Browser-, Worker- und Automationsschnittstellen einschließlich ihrer Sicherheitsbewertung sind in [`interfaces.md`](interfaces.md) erfasst.

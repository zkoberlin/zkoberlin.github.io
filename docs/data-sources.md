# Datenquellen

Die Dateien in `data/` werden öffentlich über GitHub Pages ausgeliefert. Dort dürfen deshalb keine Passwörter, Tokens oder privaten Rohdaten gespeichert werden.

| Datei | Aktualisierung |
| --- | --- |
| `geburtstage.json` | `scripts/fetch_geburtstage.py` und GitHub Action |
| `feiertage_berlin.json` | `scripts/fetch_feiertage_berlin.py`; aktuelles und folgendes Jahr, monatliche/manuelle GitHub Action |
| `namenstage.json` | Versionierte, vollständig validierte Jahresdatei. Aktuell redaktioneller Grundbestand; monatliche/manuelle GitHub Action ersetzt ihn erst nach 366 erfolgreichen Abalin-V2-Antworten. |
| `schulferien_berlin.json` | `scripts/fetch_schulferien.py`; versioniertes, vollständig validiertes Schema für Berlin und aktuelles plus folgendes Jahr; monatliche/manuelle GitHub Action |
| `transfers.json` | `scripts/fetch_transfers.py`; tägliche, schlüsselfreie und atomare Aktualisierung aus der offiziellen Bundesliga-Übersicht; Anzeige ausschließlich während konfigurierter Transferfenster |
| `union.json` | `scripts/fetch_union_openliga.py` und tägliche GitHub Action; validierter und atomar ersetzter OpenLigaDB-Snapshot |
| `special-days.json` | Validierte statische Projektdaten (Schema v2); bewegliche Hinweise werden im Frontend berechnet |

Die frühere Datei `reiselog.json` und ihre Aktualisierungspipeline wurden entfernt. Eine neue Reiseseite und ihre Datenanbindung werden später separat geplant.

## Aktualisierung

Die Workflows unter `.github/workflows/` können über GitHub Actions manuell gestartet werden. Zeitpläne und erforderliche Secrets sind jeweils im zugehörigen Workflow definiert.

Secrets gehören ausschließlich in die GitHub-Repository-Secrets oder in lokale, von Git ignorierte `.env`-Dateien. Sie dürfen niemals in HTML, JSON, Dokumentation oder Git-Commits geschrieben werden.

Private Kalender-Feed-Adressen werden als verschlüsselte Secrets des Workers `kalender-proxy` verwaltet. Das Frontend verwendet ausschließlich benannte Worker-Endpunkte und enthält nach abgeschlossener Migration keine privaten Feed-URLs mehr.

Alle Browser-, Worker- und Automationsschnittstellen einschließlich ihrer Sicherheitsbewertung sind in [`interfaces.md`](interfaces.md) erfasst.

### FitPaul: lokale Nährwerte und Energieübersicht (v6.42.0)

- `data/nutrition/bls-4.json`: Basisindex mit 7.140 Lebensmitteln, BLS 4.0, Max Rubner-Institut (2025), DOI `10.25826/Data20251217-134202-0`, CC BY 4.0; JSON-Aufbereitung durch [FoodIndex](https://food-index.de/developers), heruntergeladen am 31.10.2026. Wrapper mit Quellen- und Lizenzangaben ergänzt; Nährwerte unverändert übernommen. Numerische Zeichenketten werden bei der Berechnung konvertiert, fehlende Werte nicht als null Kalorien interpretiert.
- Berechnung im Browser anhand von Gramm pro Portion und expliziten BLS-Codes; keine persönlichen Rezepte an FoodIndex übertragen. Zwölf eigene Rezeptideen mit offengelegten Annahmen. Vorratsgewürze und nicht bezifferte Zugaben sind ausgeschlossen. Externe Rezepte ohne vollständige Zuordnung zeigen keine vermeintlich vollständigen Makros.
- Persönliche Zuordnungen in `life_records`, Kind `nutrition`, kontogebunden mit Versionsprüfung und im privaten Gesamtexport enthalten. Änderungen betreffen die Nährwertbasis; die Einkaufsliste verwendet weiterhin die Originalzutatenmengen und gespeicherten Portionen. Dieser Unterschied wird im Editor erklärt.
- Energie: vereinfachte Mifflin–St-Jeor-Formel ([Originalstudie](https://pubmed.ncbi.nlm.nih.gov/2305711/)) mit auswählbarer Formel oder expliziter Spanne, multipliziert mit Alltagsfaktor 1,4 / 1,6 / 1,8 in Anlehnung an [DGE](https://www.dge.de/wissenschaft/referenzwerte/energie/). Letzter nicht zukünftiger Gewichtsmesswert ist die Berechnungsbasis. Kalorien aus Aktivitäten nur als separat erfasste Trackerwerte; keine automatischen Verbräuche ohne entsprechende Daten und keine fingierte Ernährungserfassung.
- Gestaltungsreferenz: [Sportnahrung Engel Rezeptübersicht](https://www.sportnahrung-engel.de/fitness-rezepte). Keine Texte oder proprietären Rezeptbilder übernommen.

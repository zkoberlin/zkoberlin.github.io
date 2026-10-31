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

### FitPaul: eigenes Kochbuch und Tagesziele (v6.43.0)

Die externe Rezeptdatenbank wurde auf ausdrücklichen Nutzerwunsch durch 100 eigene deutschsprachige Rezepte ersetzt: genau 25 Frühstücke, 25 Snacks, 25 Mittagessen und 25 Abendessen. `assets/js/recipe-collection.js` ergänzt die zwölf bisherigen Gerichte, deren IDs für bestehende Favoriten und Portionszahlen erhalten bleiben. Die Rezepte sind brotfrei; Mengen beziehen sich auf eine Portion und essbaren Anteil, Getreide auf Trockengewicht, Fleisch/Fisch auf Rohgewicht und Hülsenfrüchte auf den jeweils angegebenen Zustand. Aufbewahrung und Zubereitung stehen pro Rezept dabei. Die Rezepte wurden redaktionell erstellt, jedoch nicht praktisch probegekocht. Alle vier Makros werden anhand expliziter BLS-Zuordnungen berechnet; keine erfundenen Produktwerte und keine Übertragung persönlicher Rezepte an Anbieter. Vergleichslebensmittel, Gewürzausschlüsse und mögliche Produktabweichungen werden im Nährwerteditor erläutert.

Die Suche läuft lokal über Namen, Zutaten und Mahlzeit, mit Filtern für schnelle, vegetarische, vorbereitbare Gerichte und Favoriten. Jeweils zwölf Karten werden zunächst gerendert; weitere lassen sich nachladen. Die frühere Wikibooks-Suchroute wurde entfernt; vorhandene privat gespeicherte Importe bleiben lesbar. Es wurde kein kostenpflichtiger Rezeptzugang gebucht. Die recherchierten Anbieter wurden nach der Nutzerentscheidung zugunsten eigener Rezepte nicht angeschlossen.

Tagesorientierung in `FitInsights.targets`: Kalorienziel, sofern nicht privat selbst festgelegt, ist der geschätzte Alltagsbedarf minus 300 kcal bei Zielgewicht unter Messgewicht, sonst der Alltagsbedarf; auf 50 kcal gerundet. Dies ist eine vorsichtige Produkt-Startannahme, kein gemessener Bedarf. Eiweiß wird mit 1,6 g/kg Messgewicht angesetzt, Fett mit etwa 30 % der Zielenergie, Kohlenhydrate aus der Restenergie (4/4/9 kcal/g), jeweils auf 5 g gerundet. Eine explizite Formelauswahl oder eine Spanne bleibt möglich. Quellen: [Morton et al., 2018](https://pubmed.ncbi.nlm.nih.gov/28698222/), [EFSA Referenzwerte](https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values), [NHS zum Energiedefizit](https://www.nhs.uk/better-health/lose-weight/calorie-counting/). Die tatsächliche individuelle Entwicklung und Trainingsleistung sind zur Anpassung maßgeblich; eine Auswahl je Mahlzeit ist nicht automatisch ein vollständiger Tagesplan.

### FitPaul: kurze Ausführungshilfen (v6.44.0)

`assets/js/exercise-guides.js` enthält eigene deutsche Kurztexte für die Bewegungen des bestehenden A/B/C-Plans: Einrichtung, Ausführung, je zwei Do-/Don't-Hinweise und einen Quellverweis. Grundlage sind [NASM](https://www.nasm.org/workout-exercise-guidance), die jeweiligen Einträge der [ACE Exercise Library](https://www.acefitness.org/resources/everyone/exercise-library/) sowie [NHS Balance](https://www.nhs.uk/live-well/exercise/balance-exercises/) und [NHS Kraftübungen](https://www.nhs.uk/live-well/exercise/strength-exercises/). Einzelquellen stehen bei den Übungen im Code und in der Oberfläche. Hinweise für Maschinen benennen die jeweilige Variante; einbeinige Brücken werden von beidbeinigen unterschieden. Keine Reha-Anweisung und keine ungeprüfte Bewegungserklärung für unbekannte Namen aus einem späteren Import: dort wird eine Einweisung empfohlen. Hinweise ändern keine Trainingsdaten, Lasten oder Satzvorgaben.

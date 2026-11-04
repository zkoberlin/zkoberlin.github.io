# FitPaul

Stand: 31.10.2026 · v6.50.0 · Einstieg: https://zkoberlin.github.io/fitpaul/

## Aufbau und Begrüßung

Tabs: Training, Fortschritt, Rezepte, Plan & Profil. Persönliche Begrüßung und eine von 50 Motivationen; zufällige Auswahl bei Seitenaufruf/Neuladen, kein „Neuer Impuls“-Knopf. Während eines geöffneten Seitenaufrufs bleibt die Auswahl bei normalen UI-Aktualisierungen stabil. Hell/Dunkel/Auto wird mit Hub und Journal geteilt.

## Training und JSON-Plan

Trainingspläne werden in einem separaten Chat erstellt und als JSON-Datei importiert. Eine direkte ChatGPT-/OpenAI-Anbindung ist nicht eingerichtet und nicht nötig. Der Import besitzt Vorschau und Validierung; unterstützt werden die FitPaul-Struktur sowie die bisherige `plan/workouts`-Chatstruktur. Vorlage: [fitpaul-plan-template.json](../data/fitpaul-plan-template.json).

- Planlänge ein bis zwölf Wochen; zwei bis vier verschiedene Trainingstage pro Woche, bis zu sieben Sitzungsvorlagen mit je bis zu zwölf Übungen.
- Aktiver Record: `plan/active`. Der aktuell im Produkt verwendete importierte Plan hat zwölf Wochen. Seine privaten Gewichte und Inhalte werden hier nicht kopiert.
- „Aktualisieren“ erhält den Zyklus; „neuer Durchlauf“ erzeugt einen eigenen Zyklus. Alte Trainings bleiben im Verlauf und werden bei einem strikt neuen Zyklus nicht mitgezählt.
- Nächste Einheit aus Plan und abgeschlossenen Trainings; Kalender berücksichtigt Planbeginn, gewählte Tage und mindestens zwei Kalendertage nach dem letzten erfassten Krafttraining. Alle Wochen sind als anklickbare Vorschau verfügbar. Vorschau ändert nicht die nächste Einheit.
- Training öffnen und wieder schließen. Übungen und verfügbare letzte Gewichte sind vorausgefüllt; keine automatische Gewichtserhöhung. Je Satz Gewicht, Wiederholungen/Dauer und Erledigt-Haken. Speichern erst nach Bestätigung der tatsächlich ausgeführten Sätze.
- Aufklappbare Ausführung: Startposition, Bewegung, Darauf achten, Vermeiden, Varianten-/Sicherheitshinweis und Quellenlink. Unbekannte Bewegungen erhalten allgemeine Hinweise, keine erfundene spezielle Technik.
- Der Verlauf zeigt frühere Trainings und auf Wunsch einzelne Sätze. Bearbeiten/Löschen bleibt möglich.

## Übungsfotos und Darstellung

Elf unterschiedliche Bewegungen des aktuellen Plans sind gezielt zugeordnet: Beinpresse, Brustpresse, Latzug, Wadenheben, Pallof Press, niedriger Step-up, Rudern am Gerät, wahlweise Schräg-/normale Brustpresse, Seitstütz, Einbeinstand und Dead Bug. 21 lokal ausgelieferte Fotos; meist zwei Positionen, bei der Wahl-Brustpresse beide Varianten.

Fotos erscheinen in der nächsten Einheit, im geöffneten Training und in den Wochenvorschauen. Klick öffnet die größere Ansicht. Bild und konkrete Geräteeinstellung können abweichen; Unterschiede wie höhere Stufe/Hanteln sind ausdrücklich beschrieben. Die Fotos sind keine zusätzlichen Belastungsvorgaben. Quellen/Lizenzen sind sichtbar und unter [Bildquellen](../assets/images/exercises/SOURCES.md) dokumentiert.

Karten besitzen dezente farbige Rahmen sowie Hover- und Tastaturfokus-Effekte. Anleitungen sind klar gegliedert; Nachbarkarten werden beim Aufklappen nicht künstlich in die Höhe gestreckt. Mobil stehen Hinweisblöcke untereinander; reduzierte Bewegung wird berücksichtigt.

## Fortschritt, Aktivitäten und Energie

- Gewichtsmessungen mit Datum, optional Bauchumfang, Gewichtsverlauf ab zwei Werten und Mittel der letzten sieben Tage.
- Trainingsanzahl/-verlauf und tatsächliche protokollierte Sätze/Gewichte/Wiederholungen; keine behauptete automatische Körperfettmessung.
- Zusätzliche Aktivitäten: Radfahren, E-Bike, Spazieren, Laufen, Schwimmen und Sonstiges; Dauer, optionale Strecke, Datum und Notizen. Diese ersetzen keine Krafttrainings und drehen den A/B/C-Plan nicht weiter.
- Profil: Größe, Alter, Formelwahl, Aktivitätsfaktor, Zielgewicht, mögliche Trainingstage, Notizen, Anzeigename und optional eigenes Kalorienziel.
- Kompakte Energieübersicht: Ruhebedarf, geschätzter Alltagsbedarf, Kalorienziel, Eiweiß, Kohlenhydrate, Fett. Herleitung aufklappbar. Daten aus privatem Profil/Messwerten; keine heimliche Überschreibung bestehender Einstellungen.
- Der frühere Tracker-/Aktivkalorien-Teil ist aus Oberfläche und Berechnung entfernt. Kein Ernährungstagebuch, kein automatisches Kalorienverbrauchs- oder Intake-Tracking. Schätzwerte sind keine gemessenen Verbräuche.

## Rezepte und Einkauf

100 eigene deutsche Rezepte, genau 25 je Frühstück, Snack, Mittag und Abend. Suche, Mahlzeitfilter, Favoritenfilter und Nachladen in Zwölferschritten. Schnelle Küche und Meal Prep mit Zutaten, Anleitung, Aufbewahrung und ggf. Vorratsgewürzen. Private frühere Rezeptimporte bleiben erhalten; keine neue kostenpflichtige Rezeptdatenbank erforderlich.

Nährwerte aus dem lokal enthaltenen BLS-4.0-Datensatz (7.140 Lebensmittel, Quellen-/Lizenzhinweis vorhanden). kcal, Eiweiß, Kohlenhydrate und Fett werden pro Portion berechnet und als Schätzung gekennzeichnet. Fehlende Zuordnungen werden nicht als vollständige Nährwerte ausgegeben. Erweiterter Editor erlaubt Lebensmittel-/Grammzuordnung je Portion; diese Änderung betrifft die Nährwertberechnung, nicht automatisch Rezept- und Einkaufsmengen.

Je Rezept separat gespeicherte Portionszahl. „Für Einkauf“ erzeugt eine kombinierte Einkaufsliste mit skalierten Mengen, Abhakfunktion sowie Kopieren/Textdatei-Fallback. Favoriten und Portionszahlen bleiben privat geräteübergreifend verfügbar. Eine Portionseinstellung ist eine Kochmenge und keine neue tägliche Kalorienvorgabe.

Rezeptkarte: schmale Kategorie-/Dauerzeile, Titel/Merkmale, vier Nährwerte, gemeinsamer Aktionsbereich für Portionen/Einkauf/Favorit, dann „Zutaten & Zubereitung“, zuletzt erweiterte Nährwertprüfung. Zubereitung als sprachbasiert getrennte Schritte, Aufbewahrung separat. Farbrahmen nach Mahlzeit, Hover/Fokus wie bei Training.

## Dateien und Records

| Datei | Aufgabe |
| --- | --- |
| `index.html` | Tabs, Formulare und Bereiche |
| `../assets/js/fitness.js` | Bedienung, Darstellung und private Speicherung |
| `../assets/js/training-plan.js` | Validierung, Rotation, Import, Einkaufsskalierung |
| `../assets/js/fitness-insights.js` | Energie-/Makro-/Nährwertberechnung, 50 Motivationen |
| `../assets/js/recipes.js`, `recipe-collection.js` | Eigene Rezeptauswahl |
| `../assets/js/exercise-guides.js` | Übungshinweise und Namenszuordnungen |
| `../assets/js/exercise-photos.js` | Kuratierte Fotozuordnung |
| `../data/nutrition/bls-4.json` | Lokale Nährwertdaten |

Private Record-Arten: `profile`, `plan`, `workout`, `measurement`, `favorite`, `shopping`, `recipe`, `activity`, `nutrition`. Profil-ID `main`, aktive Plan-/Einkaufs-ID `active`. Zugriff, Besitzerprüfung und Versionskonflikte: [Betriebshandbuch](../docs/operations/journal-fitness-betrieb.md).

Die Anrede folgt der Uhrzeit in Europe/Berlin: 05–10 Uhr „Guten Morgen“, 11–17 Uhr „Guten Tag“, 18–23 Uhr „Guten Abend“, 00–04 Uhr „Gute Nacht“. Sie aktualisiert sich auch bei offener Seite jede Minute und bei der Rückkehr zum Tab. Der zufällige Motivationsspruch bleibt dabei erhalten.

Seit v6.50.2 stehen 40 motivierende Anreden bereit, je zehn für Morgen, Tag, Abend und Nacht. Pro Öffnen oder Neuladen wird zufällig gewählt; innerhalb derselben Tageszeit bleibt die Anrede bei Datenänderungen stabil. Beim Tageszeitwechsel wird der passende Textpool verwendet (Europe/Berlin).

## Fortschrittsanzeige ab v6.51.0

Vollständig erledigte Trainingswochen tragen ein sattes Dunkelgrün und „✓ Abgeschlossen“; offene Wochen bleiben hellgrün. Die Kennzeichnung funktioniert unabhängig von der geplanten Zahl der Einheiten.

Im Gewichtsverlauf zeigt die Maus den jeweils nächsten gespeicherten Messpunkt mit Datum und Gewicht. Messpunkte sind auch per Berührung und Tabulatortaste auswählbar. Start, letzter Wert, Höchst- und Tiefstwert stehen mit Datum direkt unter dem Diagramm; die Extremwerte erscheinen zusätzlich als Hilfslinien im Graphen. Bei gleichen Extremwerten wird das erste Vorkommen genannt. Bereits ein einzelner Messwert wird angezeigt.

## Importierte Übungsfotos ab v6.52.0

Eine FitPaul-JSON kann einen `photoCatalog` und pro Übung eine `photoId` enthalten. Jeder Katalogeintrag hat `images` (ein bis vier Objekte mit `src` und optionaler `caption`), optional `author`, `source`, `license`, `licenseName` und `note`. Bildreihenfolge und Beschriftungen werden aus der Datei übernommen; eine statische Haltung benötigt kein erfundenes zweites Bild. Alternativ darf eine Übung denselben Fotoeintrag direkt unter `photos` enthalten.

Importierte Fotos haben Vorrang vor der Namenszuordnung. Alle Positionen erscheinen mit Beschriftung direkt in nächster Einheit, geöffnetem Training und Wochenvorschau, mit vergrößerter Ansicht per Klick. Ohne importierte Fotos bleibt die bisherige Zuordnung samt dynamischem Fallback erhalten. Externe Fotos werden erst im Browser geladen, ohne Referrer; HTTPS-Bildadressen und lokale `/assets/images/exercises/`-Rasterbilder sind erlaubt. Ausführbare/eingebettete URLs, Anmeldedaten in URLs und ungültige Quellenlinks werden abgewiesen. Nicht erreichbare Fotos bekommen einen Platzhalter. Externe Bildanbieter sehen technisch die Bildanfrage; Trainingswerte werden nicht an sie gesendet.

Katalog, Fotozuordnung und andere bestehende Planfelder bleiben beim Bearbeiten/Speichern und beim Wechsel der Einheit erhalten. Neue Trainings speichern einen validierten Fotosnapshot für spätere Bearbeitung; bestehende Trainings werden nicht umgeschrieben. `historie` in einer Importdatei bleibt ein erhaltenes Zusatzfeld und erzeugt keine erfundenen absolvierten App-Trainings. Beim Import „Aktualisieren“ wählen, um den bestehenden Zyklus zu behalten. Die 45.000-Zeichen-Grenze bleibt bestehen; Bilder als URLs referenzieren, nicht als Base64 einbetten.

Beispielstruktur (gekürzt):

```json
{
  "photoCatalog": {
    "demo": {
      "images": [
        {"src": "https://example.org/start.jpg", "caption": "Startposition"},
        {"src": "https://example.org/end.jpg", "caption": "Endposition"}
      ],
      "author": "Bildquelle", "source": "https://example.org/uebung", "license": "Unlicense"
    }
  },
  "exercises": [{"name": "Beispiel", "sets": 2, "reps": "10", "weight": null, "photoId": "demo"}]
}
```

Das Beispiel zeigt nur die zusätzlichen Felder; vollständige Pläne benötigen weiterhin Name, Startdatum, Wochen, Trainingstage und Hinweise gemäß Importvorlage. Persönliche Pläne bleiben außerhalb des öffentlichen Repositorys.

# JournalPaul

Stand: 31.10.2026 · v6.50.0 · Einstieg: https://zkoberlin.github.io/journalpaul/

## Bedienung und Inhalt

- Privater Feed für schöne, schwierige und alltägliche Erlebnisse. Der Editor öffnet sich über „Eintrag schreiben“ und lässt sich schließen.
- Datum, Überschrift und freier Text; die Überschrift ist optional. Ein Eintrag benötigt Text, einen ausgefüllten Rückblick oder ein Foto.
- Fünf freiwillige Rückblickfelder: „Was war heute am schönsten?“, „Was lief gut?“, „Was lief weniger gut?“, „Wofür bin ich dankbar?“ und „Was wünsche ich mir für morgen?“.
- Vierzehn Stimmungsmöglichkeiten einschließlich „Ohne Bewertung“: gut, zufrieden, dankbar, stolz, voller Energie, ruhig, gemischt, nachdenklich, müde, gestresst, traurig, frustriert und schwieriger Tag. Farbe und Text ergänzen sich. Desktop: Radiokacheln; mobil: synchronisiertes natives Dropdown.
- Hashtags werden vereinheitlicht, kleingeschrieben und dedupliziert. Eingabe mit Leerzeichen, Komma oder #; bis zu 20 Tags und insgesamt 300 Zeichen. Klick auf einen Tag zeigt alle passenden Einträge und setzt Zeitraum/Textsuche zurück. Danach lassen sich die Ergebnisse erneut eingrenzen.
- Zeitraumfilter: Alle, Heute, Diese Woche, Dieser Monat, Letzter Monat. Woche beginnt Montag; letzter Monat ist der vorherige Kalendermonat. Zeitraum und Textsuche sind kombinierbar; auch Rückblickantworten werden durchsucht.
- Bearbeiten und bestätigtes Löschen. Entwurf-/Speicherstatus und Konfliktmeldungen erhalten Eingaben bei Fehlern.

## Persönlicher Kopf und Gestaltung

Großes Datum und ausgeschriebener Wochentag in Europe/Berlin. Fünfzig persönliche Begrüßungen mit Paul; pro Seitenaufruf/Neuladen wird zufällig eine ausgewählt. Es gibt keinen Wechselknopf. Normale Formular- und Feed-Aktualisierungen würfeln den Text nicht neu aus. Zufall kann bei einem späteren Aufruf denselben Text treffen.

Der Zähler unterscheidet Kalendertage seit dem frühesten bisherigen Eintragsdatum, tatsächliche Schreibtage und Anzahl der Einträge. Der erste Tag zählt mit; zukünftige Datumswerte zählen nicht zur bisherigen Dauer. Es ist kein Streak-Zähler.

Farben an Kopf, Zeitraumfiltern und Einträgen; mobile Einspaltenansicht, flache Filterzeilen, linksbündige Feed-Werkzeuge und gut antippbare Aktionen. Hell/Dunkel/Auto wie im Hub; derselbe gespeicherte Farbmodus gilt für alle drei Seiten.

## Fotos

Bis zu sechs Bilder je Eintrag. Original höchstens 20 MB; Browser dekodiert, zeichnet neu und verkleinert auf maximal 1.600 Pixel Kantenlänge. Upload als WebP, bei Browser-Fallback als PNG; bei Bedarf weitere Verkleinerung, höchstens 2 MB Upload. HEIC hängt von der Dekodierfähigkeit des Geräts ab; bei Fehler JPEG/PNG verwenden.

Server prüft das aufbereitete Format und entfernt zusätzliche Metadaten. Die frühere pauschale Ablehnung von WebP-Metadaten wurde behoben. Bilder bleiben im privaten R2-Bucket; authentifizierter Zugriff prüft den Kontobesitz. Fotoansicht nutzt kurzlebige Browser-Blob-URLs. Entfernte Bilder werden nach dem Speichern ihrer entfernten Referenz separat gelöscht.

## Diktieren

„Einsprechen“ an Überschrift, Freitext und den fünf Rückblickfeldern öffnet einen Prüfdialog. Erst „Mikrofon starten“ aktiviert die Browser-Spracherkennung auf Deutsch. Stoppen → Text prüfen/korrigieren → „Text übernehmen“ ergänzt den vorhandenen Feldtext. Erst das normale Speichern schreibt den Eintrag in die Datenbank. Feldgrenzen werden ohne Abschneiden geprüft.

Der Browserdienst kann Audio extern verarbeiten; der Dialog erklärt dies vor dem Start. Der Hub speichert keine Tonaufnahmen und benötigt hierfür keinen OpenAI-Zugang. Browser ohne SpeechRecognition/webkitSpeechRecognition erhalten einen Hinweis auf die Gerätediktierfunktion. Abbruch, Logout und Formular-/Seitenwechsel stoppen das Diktat. Echte Mikrofonqualität und physische Mobilgeräte wurden bisher nicht vollständig geprüft.

## Dateien und Datenschema

| Datei | Aufgabe |
| --- | --- |
| `index.html` | Seitenstruktur und Formular |
| `../assets/js/journal.js` | Feed, Bearbeiten, Filter, Speichern und Fotos |
| `../assets/js/journal-model.js` | Fragen, Stimmungen, 50 Begrüßungen, Tag-Normalisierung, Zähler |
| `../assets/js/journal-dictation.js` | Spracherkennungs-/Prüfdialog |
| `../assets/js/life-api.js` | Gemeinsamer privater Datenzugriff und Bildaufbereitung |
| `../assets/css/life.css` | Darstellung und mobile Regeln |

Privater Record `kind=journal`: `date`, `title`, `body`, `mood`, `tags`, `photos` sowie optional `reflections` mit `highlight`, `wentWell`, `lessWell`, `gratitude`, `tomorrow`. Alte Einträge ohne Rückblick bleiben gültig. Überschrift max. 160, Freitext max. 20.000, jede Rückblickantwort max. 2.000 Zeichen. Jede Speicherung verwendet die bestehende Versionsnummer zur Konflikterkennung.

Der private Export enthält Records beider Bereiche und Fotos. Es gibt keinen automatischen Wiederherstellungsimport; siehe [Betriebshandbuch](../docs/operations/journal-fitness-betrieb.md).

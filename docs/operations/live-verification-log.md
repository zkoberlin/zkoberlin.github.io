# Live-Verifikationsprotokoll

Dieses Protokoll hält gemeinsam durchgeführte Prüfungen produktiver Releases fest. Es enthält keine Zugangsdaten oder privaten Finanzwerte.

## 28.08.2026 – Geschützte Portfolio-Kachel im Hub

- Umgebung: produktive GitHub-Pages-Seite, Desktop-Browser und Cloudflare-Gateway
- Geprüft: Anmeldung, lesbare Desktop-Darstellung, Top-3-Übersicht, weitere Positionen und Datenstatus
- Sicherheit: Portfolio-Vorschau nur authentifiziert; ehemalige öffentliche Markt-Endpunkte nicht mehr verfügbar
- Ergebnis: erfolgreich, vom Nutzer als funktionsfähig und optisch passend bestätigt

## 28.08.2026 – FinanzenPaul D1-Migration

- Umgebung: produktive GitHub-Pages-Seite und Cloudflare-Gateway, persönlicher Browser
- Geprüft: Anmeldung, vollständige Anzeige des bestehenden Finanzstands, Änderung eines Testwerts, automatisches Speichern, vollständiges Neuladen und persistierter Wert
- Geprüft: Hub-Finanzvorschau zeigt passenden Puffer und passende Sparquote sowie `Cloudflare D1 · geschützt`
- Sicherheit: `/finance` und `/finance-preview` antworten ohne Authentifizierung mit `401`; der Hub erhält keine Einzelposten
- Abschluss: alter JSONBin-Zugriff aus dem Frontend entfernt und bisheriger X-Master-Key bei JSONBin regeneriert
- Einschränkung: private Alt-Bins bleiben vorläufig als manuelles Backup bei JSONBin bestehen
- Ergebnis: erfolgreich


## 31.10.2026 JournalPaul und FitPaul v6.37.0

- Release: `1ddd603`, GitHub Pages Lauf `41224516873` erfolgreich. Gateway-Version `603d7b7d-a7dc-42ba-bb4d-09814746e3f6`.
- Umgebung: produktive GitHub-Pages-Domain und Cloudflare-Gateway, lokale Chrome-Vorschau auf macOS.
- 13 Gateway-Tests erfolgreich, einschließlich neuer Kontotrennung, Revisionskonflikte, Eingabegrenzen und unberechtigter Fotoverknüpfung.
- Migration 0005 angewendet, privater R2-Bucket angelegt; persönliche Startdatensätze außerhalb des öffentlichen Repositorys importiert.
- D1-Sicherung privat außerhalb des Repositorys abgelegt und in einer isolierten SQLite-Datenbank wiederhergestellt; drei neue Datensätze vorhanden. R2 war bei Einrichtung leer. Automatische unabhängige Bildsicherung und Bildwiederherstellung bleiben offen.
- Lokale abgemeldete Journalansicht in Chrome geladen. Nutzer meldete Google `400 origin_mismatch`; lokaler Ursprung ist nicht als funktionierend verifiziert. Es wurde keine Google-OAuth-Freigabe geändert.
- Live-Seiten und gemeinsame Version per HTTP geprüft; private Journal-, Trainings-, Export- und Bildrouten ohne Anmeldung gesperrt. Öffentlicher Standortpfad weiterhin erreichbar.
- Noch offen: angemeldete Live-Nutzung beider Seiten, echter Foto-Upload samt Löschen und Export, geräteübergreifender Abgleich sowie mobile Geräteprüfung. Die produktive Anmeldung ist nach dieser Erweiterung noch nicht im Browser bestätigt.


## 31.10.2026 Journal und FitPaul v6.38.0

- Nutzer bestätigt grundsätzliche Funktionalität von v6.37.0; einzelne Fotoabläufe sind damit nicht separat verifiziert.
- Journal: Editor standardmäßig geschlossen, Öffnen über Button, Bearbeiten öffnet den Editor. Hub-Karten mit pinkem beziehungsweise grünem Rahmen.
- Fitness: getrennte Bereiche Training, Fortschritt, Rezepte und Plan/Profil. Privater Startplan mit vier Trainingswochen; nächste Einheit anhand ausgewählter Wochentage und Erholungstag. Letzte Gewichte werden vorausgefüllt, nicht automatisch erhöht. Kein automatischer ChatGPT-API-Aufruf; Anfrage kopieren und validierter Planimport sind vorhanden.
- Einkauf: Rezepte wählen, gemeinsame Portionszahl, automatisch summierte gleiche Zutaten, Abhaken und privates Speichern. Änderungen an Auswahl oder Portionen setzen Häkchen zurück. Kopieren mit Textdatei als Alternative.
- 20 automatisierte Tests erfolgreich, einschließlich Terminplanung, Planwechsel, Kontotrennung und Mengenaddition. DOM-Interaktionstest mit synthetischen Daten erfolgreich: Bereichswechsel, Training vorausfüllen, Einkaufsliste skalieren/speichern/abhaken, Journal öffnen/speichern/bearbeiten. Keine echten Nutzerdaten für diese Tests verwendet.
- Visuelle Browserprüfung aktuell eingeschränkt: In-App-Tab nicht erreichbar; native Chrome-Erfassung scheitert mit ScreenCaptureKit-Fehler -3811. Keine bestätigte visuelle Mobile-Prüfung dieses Layouts. DOM-Prüfungen ersetzen keine Sichtprüfung.
- Gateway veröffentlicht mit Version 287e46c0-9ec3-43c6-b745-07fbc2d5cd8c. Pages-Release `323ab21` über Lauf `41226490866` erfolgreich. Hub, Journal, FitPaul und Versionsdatei liefern `200` mit den neuen Inhalten und v6.38.0; private Plan-, Einkaufslisten- und Exportrouten liefern ohne Anmeldung `401`.


## 31.10.2026 Journal und FitPaul v6.39.0

- Einheitliche Karten- und Formularabstände auf beiden Seiten, doppelten Innenabstand entfernt, Messwertformular ohne leere zweite Spalte. Lokale Chrome-Sichtprüfung im dunklen Desktopdesign für FitPaul-Training, Rezeptkarten und geöffneten Journaleditor mit synthetischen Daten durchgeführt. Mobile Geräteprüfung noch offen.
- Portionszahlen werden pro Rezept gespeichert; bestehende Favoriten bleiben unverändert in der privaten D1-Datenbank. Legacy-Portionszahl wird beim Laden auf einzelne Rezepte übertragen. Einkaufsliste rechnet mit den jeweils gespeicherten Rezeptportionen.
- Neue private Suchschnittstellen für TheMealDB und deutsche wger-Übungsnamen. Externe Rezepte können mit Quellennachweis privat übernommen werden. Fehlende Nährwerte werden nicht ergänzt; mehrdeutige Zutaten bleiben als Originalangabe markiert.
- JSON-Import aus der Oberfläche entfernt. Normaler Planeditor mit Trainingstagen, A/B/C-Einheitenauswahl und Übungssuche. Vollständiger vom Nutzer übermittelter Vierwochenplan auf die aktuell gewünschten maximal 60 Minuten angepasst; Wochenentwicklung ohne automatische Gewichtserhöhung. Optionale Reha-Übungen bleiben außerhalb des aktiven Plans.
- 25 Tests bestanden, darunter neue Mengenrechnung pro Rezept, Import mit Bruchangaben, A/B/C-Wechsel und Ausschluss weitergereichter Anmeldedaten. DOM-Bedienprüfung mit synthetischen Daten bestanden: Portionszahlen speichern, Einkauf abhaken, Plan über Formular speichern, externes Rezept übernehmen, Journal bearbeiten. HTML-Struktur geprüft.
- Pages-Release `b3f1c3a` über Lauf `41228082373` erfolgreich; Gateway-Version `bd809f54-23cb-42b6-86a7-3225d805e6ac`. Journal, FitPaul und Versionsdatei liefern `200` mit v6.39.0; neue private Such- und Rezeptrouten ohne Anmeldung `401`. Angemeldete Chrome-Liveprüfung: nächste Einheit B am 02.11.2026 und 1/12 Einheiten sichtbar, A/B/C-Planfelder gefüllt, bestehender Chili-Favorit sowie alte Portionszahl sechs erhalten, TheMealDB-Suche nach Hähnchen liefert Rezeptkarten mit Bildern. Rezeptübernahme und Portionsspeicherung automatisiert mit synthetischen Daten geprüft; keine Teständerungen an echten Favoriten oder Einkäufen vorgenommen. Öffentliche Anbieterdaten wurden zusätzlich direkt erfolgreich abgefragt. Ein versehentlich im Checkout-Hauptordner gestarteter Bereitstellungslauf wurde gestoppt; Cloudflare bestätigte, dass kein zusätzlicher Worker entstanden ist. Generierte lokale Konfiguration entfernt.


## 31.10.2026 FitPaul v6.40.0

- FitPaul grundlegend als Trainingsablauf überarbeitet: zentrale nächste Einheit, A/B/C-Folge, Übungskarten mit Bildern, Satzprotokoll mit erledigt-Häkchen, Gewichten und Wiederholungen. Training wird erst beim Abschließen gespeichert. Historische Einträge bleiben kompatibel.
- Nutzer bestätigt A am 31.10.2026 als durchgeführt. Bestehender Eintrag erhält nur die passende A- und Zykluszuordnung; Leistungsdaten und Notizen bleiben erhalten. Rotation berücksichtigt explizite Einheiten-ID, sodass nach A die Einheit B folgt.
- Deutschsprachige Rezeptsuche aus Wikibooks statt englischer Suche. Vorhandene private Favoriten, Portionszahlen und Rezepte werden erhalten. Nährwerte und unklare Originalmengen werden nicht erfunden.
- Direkte OpenAI-Anbindung mangels API-Zugang nicht aktiviert. Nutzer über fehlenden Zugang befragt; Status in den Einstellungen sichtbar. Kein nur vorgetäuschter Generierungsbutton.
- 28 automatisierte Tests bestanden: unter anderem A-zu-B-Rotation, Satzdaten, deutsche Rezeptübernahme, Speicherung, Zugriffsschutz und Portionsrechnung. DOM-Bedienprüfung mit synthetischen Daten für Satzbestätigung, Abschluss, Rezeptübernahme, Planeditor und Journal bestanden. HTML-Struktur geprüft.
- Lokale Chrome-Sichtprüfung im dunklen Desktopdesign zeigt B als Nächstes, A als erledigt, Bilder der sieben B-Übungen und die neue Kartenstruktur. Bilder wurden mit echten öffentlichen Quellen und synthetischen Leistungsdaten geprüft. Eine spätere weitere Browserabfrage lief in einen Timeout; eine physische Mobile-Geräteprüfung ist nicht erfolgt.
- Datenquellen direkt erfolgreich abgefragt: deutsche Rezepttexte sowie Übungsbilder mit Quellen und Lizenzen. Designreferenzen: [Hevy Trainingsprotokoll](https://www.hevyapp.com/features/track-workouts/), [Strong](https://www.strong.app/), [Eat this Rezeptübersicht](https://www.eat-this.org/rezepte/). Keine fremden Layouts oder proprietären Bilder kopiert.
- Pages-Release `c633f5e` über Lauf `41229964787` erfolgreich; Gateway-Version `36a040dd-aa47-4bde-a9a4-0c6c454b4856`. Live v6.40.0 in angemeldetem Chrome nach Neuladen ohne Cache geprüft: B am 02.11.2026, A als erledigt, sieben B-Übungsbilder geladen; B-Protokoll zeigt 0/14 Sätze und bekannte Gewichte. Protokoll wieder geschlossen, kein Testtraining gespeichert. Deutsche Wikibooks-Suche nach Hähnchen liefert Rezepte einschließlich Bild und vier Originalportionen für Hähnchen-Curry mit Bohnen. Private Medien- und Trainingsrouten ohne Anmeldung gesperrt. Bisherige Favoriten und Portionszahlen weiterhin vorhanden. Physische Mobile-Prüfung bleibt offen.

## 31.10.2026 FitPaul v6.41.0

- Zusätzliche Aktivitäten separat vom Kraftplan: Radfahren, E-Bike, Spazieren, Laufen, Schwimmen und Sonstiges. Private Speicherung mit Datum, Dauer, optional Strecke, optional Aktiv-Kalorien vom Tracker und Notizen; Bearbeiten und Löschen mit Versionsprüfung. Keine erfundenen Kalorien ohne Daten, keine Veränderung der A/B/C-Rotation durch Aktivitäten.
- Vier klickbare Trainingswochen mit A/B/C-Vorschau und Wochenprogression. Vorschau ändert weder nächste Einheit noch Trainingsfortschritt. Training über oberen Schließen-Button, Startbutton und unteren Button schließbar; bei Änderungen Rückfrage.
- Verlauf als Karten mit Bewegung/Kraft, Datum und Kennzahlen, Übungen platzsparend aufklappbar. Fortschritt zeigt zusätzliche Aktivitäten, Minuten und erfasste Strecke der letzten sieben Tage; Umfang der Erfassung erklärt. Plan und Profil erhalten Farbakzente.
- 29 automatisierte Tests bestanden; zusätzliche DOM-Prüfung für Aktivitätsspeicherung, unveränderte nächste Krafteinheit, vier Wochenkacheln und oberen Schließen-Button bestanden. Bestehende Rezept-/Einkaufs-/Journal-Bedienprüfung weiterhin erfolgreich. Angemeldete Live-Speicherung und physische Mobile-Prüfung in diesem Release noch nicht durchgeführt.
- Rezept-Nährwertausbau, Begrüßung und Energiebedarfsanzeige sind nicht Bestandteil dieser Zwischenversion.
- Veröffentlichung: Feature-Commit `61b229f`, Pages-Lauf `41232100009`, Gateway-Version `23c665e9-ba0a-4f26-927d-34072dbcbcb0`. Live-Versionsdatei liefert v6.41.0. Private Aktivitätsroute ohne Anmeldung liefert `401` (curl). Angemeldete Chrome-Prüfung: Aktivitätsformular mit Datum, Typ, Dauer, Strecke und optionalen Tracker-Kalorien geöffnet und wieder geschlossen; vier Wochenkacheln sichtbar, Woche 4 zeigt A/B/C-Vorschau; nächste Einheit bleibt B, 02.11.2026, 1/12. Dunkle Desktopansicht visuell geprüft. Keine synthetische Aktivität im echten Konto gespeichert.

## 31.10.2026 FitPaul v6.42.0

- Begrüßung mit dem authentifizierten Vornamen, Tageszeit Berlin und 50 eigenen Motivationssprüchen; täglicher Wechsel und weiterer Impuls per Button. Persönliche Namen werden nicht im öffentlichen Quelltext hinterlegt.
- Energieübersicht mit geschätztem Ruhe- und Alltagsbedarf sowie separat erfassten Aktiv-Kalorien des Tages. Alter, Formel und Alltag im privaten Profil einstellbar. Bestehendes Profil ausschließlich um fehlende Berechnungsparameter, Büro-Alltag und Formelstatus „Spanne“ ergänzt, übrige Daten erhalten. Ohne Formelwahl keine Geschlechtsannahme. Gewicht stammt aus tatsächlichem Messwert mit angezeigtem Datum.
- Einheitliche Rezeptkarten mit vier Makros, Portionszahl, Favoriten, Einkauf und aufklappbaren Details. Acht weitere eigene Ideen, insgesamt zwölf vorbereitete Gerichte. Deutsche BLS-Nährwertbasis lokal, lizenzkonform mit Quellenangaben. Fehlende Zuordnungen externer Rezepte sichtbar; Lebensmittel aus 7.140 Datensätzen und Gramm pro Portion privat zuordnen und speichern. Berechnungsbasis separat von Originalrezept/Einkaufsmengen, im Editor erläutert.
- 35 automatisierte Tests erfolgreich: Formeln, unvollständige Nährwerte, BLS-Mappings, Validierung, private Speicherung und Nutzertrennung, 50 Sprüche sowie bestehende Trainings-/Rezept-/Zugriffsschutztests. DOM-Prüfung mit synthetischen Daten: Begrüßung, Spruchwechsel, zwölf vollständige Makroanzeigen, Zuordnung speichern, Portionen/Einkauf, Training/Rotation, Wochenvorschau und Journal erfolgreich. Chrome-Desktopvorschau mit klar markierten Testdaten: Begrüßung/Energie und dreispaltige Rezeptkarten visuell geprüft. Physische Mobile-Prüfung offen.
- Live veröffentlicht: Feature `e9b8bfc`, abschließende Korrekturen `4d91cc1` (Quellenanzeige alter Importe und privates Vornamensfeld), Pages-Lauf `41233031613`; Gateway-Version `6a599f2f-f73a-4fa5-a9b4-fc5b57e62e66`. Private Nährwertroute ohne Anmeldung `401`; Versionsdatei und Profilfeld live abrufbar.
- Angemeldete Chrome-Liveprüfung nach Neuladen ohne Cache: „Guten Abend, Paul.“, Energieübersicht mit passenden Mess- und Profilwerten; Bedarf als Formeln-Spanne ausgewiesen, keine behaupteten Trackerwerte. B bleibt nächste Einheit mit 1/12. Zwölf Rezeptkarten mit allen vier Makros; bisheriger Chili-Favorit und Portionszahl sechs der bisherigen Gerichte erhalten. Persönlicher Vorname im privaten Profil ergänzt, da bestehende Anmeldung keinen Namen zurückliefert. Keine Testrezepte oder Aktivitäten im echten Konto gespeichert. Speicherung der Nährwertzuordnung automatisiert mit synthetischen Daten geprüft; nicht im echten Konto verändert. Physische Mobile-Prüfung bleibt offen.

## 31.10.2026 Hub und FitPaul v6.43.0

- Hub-FitPaul-Kachel zeigt Wochentag, Datum und Einheit des nächsten Trainings aus derselben Berechnungsfunktion wie FitPaul. Abgeschlossener oder fehlender Plan wird ausdrücklich benannt; keine private Abfrage ohne Anmeldung.
- Tracker-Aktivkalorien aus Oberfläche, Aktivitätsformular, Verlauf und Energieberechnung entfernt. Gewichtsmessungen und zusätzliche Aktivitäten mit Dauer/Strecke bleiben erhalten. Historische Rohdaten bleiben unverändert; es werden keine neuen Trackerwerte erfasst.
- JSON-Dateiimport mit Vorschau, Dateigrößenprüfung und Validierung. Unterstützt FitPaul-Vorlage sowie bisherige Chatstruktur mit `plan/workouts`. Aktualisierung erhält den aktuellen Zyklus, neuer Durchlauf bekommt einen eigenen Zyklus und zählt alte Einträge nicht mit. Alte Trainings werden nicht gelöscht. Beispieldatei unter `data/fitpaul-plan-template.json`; direkte KI-Anbindungsfläche aus Einstellungen entfernt.
- Nutzer verwirft die externe Rezeptdatenbank zugunsten eigener Inhalte. 100 eigene Rezepte, exakt 25 je Frühstück/Snack/Mittag/Abend, mit Grammangaben, Anleitung, Lagerhinweisen und vollständig berechenbaren vier Makros aus BLS. Bestehende zwölf IDs/Favoriten/Portionen bleiben kompatibel. Lokale Suche, Kategorien, Filter und Nachladen in Zwölferschritten; keine kostenpflichtige Anbindung. Private Altimporte bleiben verfügbar.
- Übersicht ergänzt Kalorienziel und Tagesrichtwerte für Eiweiß/Kohlenhydrate/Fett. Herleitung aufklappbar; optionales persönliches Kalorienziel im Profil. Vorhandene persönliche Profilauswahl wird nicht überschrieben. Es gibt kein Intake- oder Kalorientracking.
- 40 automatisierte Tests bestanden: unter anderem Hub-Termin B am Montag 02.11.2026, Zugriffsschutz, 100 eindeutige Rezept-IDs, Kategorieanzahlen, BLS-Zuordnungen aller Rezepte, Makrobilanz, beide JSON-Formate und Zykluswechsel. DOM-Prüfung mit synthetischen Daten bestanden: JSON-Datei laden/Vorschau/Übernahme, Kategorien 25 Rezepte, 12/24/25 Nachladen, Umlautsuche, sechs Bedarfskarten, Portionen/Einkauf und Journal. Markierte Chrome-Desktopvorschau zeigt sechs Tageswerte sowie Snackkarten mit konsistenten Abständen. Kein Testplan im echten Konto gespeichert. Physische Mobile-Prüfung offen.
- Veröffentlichung: Feature `838f648`, Pages-Lauf `41235460948` erfolgreich, Gateway-Version `de215092-a108-4017-b754-da4ca8bd5202`. Live-Versionsdatei v6.43.0, private Profilroute ohne Anmeldung `401`.
- Angemeldete Chrome-Liveprüfung nach Neuladen ohne Cache: Hub-FitPaul-Kachel zeigt Montag, 02.11.2026 und B. In FitPaul sechs Bedarfskarten mit Tages-Kalorienziel und drei Makros; keine Tracker-Kalorienanzeige. Eigene Rezepte mit vier Kategorien à 25, Snacks mit Nährwerten und Standardportion eins. Bisheriger Chili-Favorit und gespeicherte Portionszahlen erhalten. JSON-Importfläche, Startdatum, Auswahl „Fortschritt behalten“ sowie optionales Kalorienziel im Profil sichtbar. Kein echter Plan zu Testzwecken überschrieben. Rechen-/Speicherprüfung des Imports mit synthetischen Daten erfolgreich; physisches Mobilgerät weiterhin nicht geprüft. Testdaten in Rechentests sind unabhängig vom persönlichen Profil.

## 31.10.2026 Hub, Journal und FitPaul v6.44.0

- Eigene kurze Übungshilfen für alle aktuellen A/B/C-Bewegungen mit Startposition, Ausführung, „Darauf achten“ und „Vermeiden“ sowie Quellen. Aufklappbar auf den Übungskarten, im laufenden Training und in der Wochenvorschau; dort mit Übungsnamen. Sitzende und freie Varianten werden nicht gleichgesetzt, einbeinige Brücke wird unterschieden. Unbekannte importierte Übungen erhalten nur allgemeine Hinweise, keine erfundene spezifische Anleitung.
- Gemeinsames `theme.js` für Hub, JournalPaul und FitPaul. Derselbe runde Drei-Modi-Button, bestehender Schlüssel `hub_theme` unverändert übernommen. Hell → Dunkel → Auto, OS-Wechsel im Automatikmodus, Speicherung vor dem ersten Rendern und Synchronisation zwischen Tabs. Blockierter Browserspeicher führt nicht zum Absturz. Keine Veränderung privater Inhaltsdaten.
- Energieübersicht mit allen sechs bisherigen Werten und kleinen Icons deutlich verkleinert: sechs kompakte Karten in einer Desktopzeile, enges Raster auf kleineren Bildschirmen. Berechnung unverändert und weiter aufklappbar. Im lokalen Screenshotvergleich bei gleicher Desktopbreite etwa 270 statt 715 Bildpixel hoch, also unter der halben bisherigen Höhe. Keine physische Smartphone-Prüfung.
- 45 automatisierte Tests bestanden, darunter Modi-Wechsel/Persistenz/OS/Tab-Ereignisse, gesperrter Speicher, Abdeckung der aktuellen Übungen und unbekannte Varianten. Bestehende DOM-Bedienprüfung für Training, Wochenvorschau, JSON, Rezepte/Einkauf und Journal weiterhin erfolgreich; zusätzlich Ausführungshilfe auf Vorschaukarte und im laufenden Training geprüft.
- Lokale Chrome-Vorschau mit klar markierten synthetischen Daten: kompakte Übersicht im hellen und dunklen Design visuell geprüft, Beinbeuger-Hilfe geöffnet, Modus Hell → Dunkel → Auto geprüft. Keine Trainings zu Testzwecken im echten Konto gespeichert. Backend unverändert; daher keine neue Worker-Bereitstellung erforderlich.

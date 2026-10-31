# JournalPaul und FitPaul – umgesetzte Entscheidungen

Stand: 31.10.2026 · v6.50.0. Ersetzt den frühen Konzept-/Ideenstand vom selben Tag. Die Umsetzung ist produktiv; die vollständigen Bereichsbeschreibungen stehen in [JournalPaul](../journalpaul/README.md), [FitPaul](../fitpaul/README.md) und [Hub-Anbindung](hub-integration.md).

## Festgelegt und umgesetzt

1. Zwei eigenständige private Unterseiten plus Hub-Kacheln; bestehende gemeinsame Anmeldung, Version und Farbmodi.
2. Journal als privater Feed, ergänzbar um freiwillige Tagesfragen, Fotos, differenzierte Stimmung, klickbare Hashtags und Zeitraumfilter. Editor zunächst geschlossen. Kein Schreibzwang.
3. Spracheingabe als Browserdiktat mit bewusster Aktivierung, Hinweis auf mögliche externe Audioverarbeitung und prüfbarer Textübernahme. Keine Tonaufnahmen im Hub.
4. Trainingspläne entstehen außerhalb des Hubs im separaten Chat und werden per JSON importiert. Vorschau, Zykluswechsel, automatisch vorausgefüllte nächste Einheit und alle Wochen zum Anklicken. Kein API-Schlüssel im Browser.
5. Rezepte aus eigener deutscher Sammlung statt laufend kostenpflichtiger externer Rezeptdatenbank. 100 Rezepte; lokale BLS-Nährwerte, private Favoriten, pro Rezept gespeicherte Portionen und automatische Einkaufsliste.
6. Fortschritt über reale Messungen und protokollierte Trainings/Aktivitäten. Keine fiktiven Trackerwerte, kein Intake-Tracking, kein garantierter Gewichtsverlust und keine gemessene Körperfettanzeige.
7. Echte kuratierte Übungsfotos mit Quellen/Lizenzen, für importierte Namen gezielt zugeordnet; keine unpassenden Hantelübungen als Maschinenfotos ausgeben.
8. Mobile Lesbarkeit, kompakte Köpfe, konsistente Abstände, sparsame Farbrahmen sowie Hover-/Tastaturfokus statt überladener Karten. In Hover-Effekten reduzierte Bewegung berücksichtigen.
9. Motivation und Journalbegrüßung zufällig pro Seitenaufruf/Refresh; keine manuellen Wechselknöpfe.

## Bewusst nicht vorhanden oder noch offen

- Keine direkte ChatGPT-/OpenAI-Anbindung; kein separater API-Zugang eingerichtet. Eine spätere Verbindung wäre ein eigenständiges Vorhaben.
- Keine kostenpflichtige externe Rezeptsuche als Voraussetzung.
- Kein automatisches vollständiges Restore-Werkzeug für Exporte und kein belegter vollständiger Wiederherstellungstest.
- Keine automatische unabhängige R2-Sicherung; siehe Betriebshandbuch.
- Keine privaten Fitness-Fortschrittsfotos, die man mit Journalfotos verwechseln darf; diese ursprüngliche Idee ist nicht als Fitnessfunktion umgesetzt.
- Kein Journal-Kalendermodus, kein automatischer Rückblickgenerator, keine KI-Auswertung privater Texte.
- Browserdiktat und HEIC hängen vom Browser ab. Echte Mikrofonqualität und physische Smartphone-/Safari-Prüfungen bleiben gesondert zu bestätigen.

## Release- und Prüfverlauf

Die einzelnen Änderungen von v6.37.0 bis v6.49.2 und die neue Impulsauswahl in v6.50.0 sind im [Live-Prüfprotokoll](operations/live-verification-log.md) dokumentiert. Dort werden produktive Tests von synthetischen Layout-/DOM-Tests unterschieden. Historische Datums-/Zahlenwerte sind keine Zusage über einen späteren Livezustand.

# JournalPaul und FitPaul

Stand: 31.10.2026. Journalvariante bestätigt. Erste Umsetzung für v6.37.0 vorbereitet.

Zwei neue private Bereiche ergänzen den Hub und erhalten eigene Unterseiten. Sie übernehmen Gestaltung, mobile Bedienung, gemeinsame Anmeldung und Versionsanzeige. Vorgeschlagene Namen und Pfade: JournalPaul unter `/journalpaul/`, FitPaul unter `/fitpaul/`.

## JournalPaul

Drei mögliche Ansätze:

1. Persönlicher Feed: kurze oder lange Beiträge mit Datum, mehreren Fotos, optionaler Stimmung und eigenen Schlagworten. Positive, schwierige und alltägliche Erlebnisse stehen gleichberechtigt nebeneinander.
2. Geführtes Tagebuch: freiwillige Fragen wie „Was war schön?“, „Was war schwierig?“ und „Was möchte ich festhalten?“. Freitext bleibt jederzeit möglich.
3. Visuelles Erinnerungsbuch: Monatskalender, Fotokacheln, Suche und Rückblicke auf frühere Einträge.

Bestätigte erste Version: Feed mit optionalen Tagesfragen, Fotoanhängen, Bearbeiten, Löschen und Suche. Kalender und Rückblicke folgen später. Kein Schreibzwang und keine automatisch veröffentlichen Inhalte.

Im Hub: kompakte Karte mit „Eintrag schreiben“, Datum des letzten Eintrags und Link zum Journal. Private Inhalte und Bildvorschauen erst nach Anmeldung; auf der Übersicht keine ausführlichen Tagebuchtexte.

## FitPaul

Ziele: Gewichtsreduktion, Kraftaufbau und geringerer Bauchumfang. Persönliche Messwerte, Verletzungsangaben und Trainingsleistungen werden getrennt von dieser öffentlichen Projektdokumentation privat verwaltet.

Profilangaben und erste Trainingsleistungen wurden aus den Nutzeraussagen erfasst und lokal außerhalb des Repositorys privat vorbereitet. Die erste Einheit ist einschließlich Sätzen, Wiederholungen und ergänzenden Übungen privat erfasst. Allergien und Unverträglichkeiten wurden abgefragt und im privaten Profil erfasst. Diese Vorbereitung ist noch keine Speicherung in der späteren Anwendung. Keine festen Kalorienziele aus Alter und Gewicht allein ableiten.

Die Rezeptansicht unterstützt schnelle Gerichte, One-Pot-Zubereitung und Meal Prep mit skalierbaren Portionen und Gefrierhinweisen. Der Trainingsplan berücksichtigt verfügbare Zeit, Erfahrung, Erholung und individuell gemeldete Einschränkungen; persönliche Werte werden nicht fest im Quellcode hinterlegt.

Erste Version:

- Profil und anpassbare Ziele.
- Persönlicher Ganzkörperplan nach Klärung der Ausgangslage; Übungen mit Sätzen, Wiederholungen, Pausen und Alternativen. Gewichte anhand sauberer Ausführung bestimmen.
- Training protokollieren: Datum, Übung, Gewicht, Sätze, Wiederholungen und Notizen. Frühere Leistungen beim nächsten Training anzeigen.
- Gewichtskurve und Wochenmittel, optional Bauchumfang und private Fortschrittsfotos. Kraftfortschritt neben Gewicht darstellen.
- Redaktionell geprüfte Rezeptauswahl mit Zutaten, Portionen, Zubereitung und gekennzeichneten Nährwertschätzungen; Filter für Vorlieben, Allergene und Kochzeit. Favoriten speichern. Automatische Rezeptgenerierung separat entscheiden, nicht voraussetzen.

Im Hub: nächstes Training, letzter gespeicherter Gewichtsstand und direkter Einstieg. Keine automatische Übernahme sensibler Journalinhalte oder vorhandener Tracker-Daten.

Trainingsrahmen zur späteren Personalisierung: zwei bis drei Ganzkörpereinheiten pro Woche mit Erholung dazwischen und ergänzender Alltagsbewegung. Die allgemeine Erwachsenenempfehlung umfasst mindestens zwei Krafttage und 150 Minuten moderate Aktivität pro Woche; Anfänger steigern schrittweise. Kein zugesagter Abnahmetermin.

Quellen: [CDC Bewegung für Erwachsene](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html), [CDC Aktivität und Gewichtsmanagement](https://www.cdc.gov/healthy-weight-growth/physical-activity/index.html), [CDC Gewichtsabnahme](https://www.cdc.gov/healthy-weight-growth/losing-weight/).

## Speicherung und Schnittstellen

Bestehende Grundlage: statische GitHub-Pages-Seiten, gemeinsamer privater Cloudflare-Gateway, Google-Anmeldung und D1. Neue persönliche Inhalte gehören nicht in öffentliche JSON-Dateien oder Git.

Neue Tabellen erhalten von Beginn an eine serverseitig ermittelte Kontozuordnung. Jeder Lese-, Schreib-, Export- und Löschzugriff prüft die Berechtigung. Journalbeiträge, Bildmetadaten, Fitnessprofil, Trainingsplan, Trainingseinheiten, Messwerte und Rezeptfavoriten werden dauerhaft in D1 gespeichert.

Fotoobjekte kommen in einen privaten Objektspeicher, beispielsweise R2, ohne öffentliche Bucket-Freigabe. Zugriff nur nach Berechtigungsprüfung. Dateityp und Größe prüfen, zufällige Objektschlüssel verwenden und Standortmetadaten entfernen. Upload-Abbrüche sowie verwaiste Bilder berücksichtigen. Kein Hochladen persönlicher Daten an KI-Dienste ohne gesonderte Entscheidung.

Speicherstatus sichtbar machen: Entwurf, wird gespeichert, gespeichert oder Fehler. Eingaben bei Fehlern erhalten. Export und vollständige Löschung einschließlich Bildern vor dem ersten produktiven Einsatz vorsehen. Backup und Wiederherstellung für Datenbank und Bilder gemeinsam festlegen und prüfen.

## Umsetzung und Releases

1. Journalvariante und Fitnessausgangslage klären; bestehende zwölf Arbeitskopieänderungen gegen Remote und Stash abgleichen.
2. Hub-Karten und gemeinsame private Speichergrundlage umsetzen, Schnittstellen und Schutz prüfen.
3. JournalPaul mit Feed und Bildern vollständig umsetzen und prüfen.
4. FitPaul mit abgestimmtem Plan, Protokoll, Messwerten und Rezepten umsetzen und prüfen.
5. Jeden nutzbaren Abschnitt als Feature mit passender gemeinsamer SemVer veröffentlichen. Versionsnummer erst anhand des dann aktuellen Release-Stands bestimmen.

Prüfungen pro Abschnitt: mobile Bedienung, helle und dunkle Darstellung, Anmeldeablauf, geräteübergreifendes Speichern, Berechtigungsfehler, Eingabevalidierung, Bearbeiten und Löschen. Fotoabschnitt zusätzlich mit echter Datei, abgebrochenem Upload und unberechtigtem Bildabruf prüfen. Nach Veröffentlichung Live-Version und nicht angemeldete Zugriffe prüfen sowie angemeldete Nutzung verifizieren. Ergebnisse und verbleibende Grenzen in `docs/operations/` dokumentieren.

Implementierung: Hub-Karten, Journal mit Fotoanhängen, FitPaul mit Trainingsplan, Protokoll, Messwertverlauf, Profil und vier skalierbaren Rezepten. Der Liveprüfstand wird im Betriebsprotokoll dokumentiert.

## Weiterentwicklung der Bedienung

Ab v6.38.0 öffnet sich der Journal-Editor erst auf Wunsch. FitPaul führt mit einer nächsten Einheit aus einem privat gespeicherten Trainingsplan; Training, Fortschritt, Rezepte und Einstellungen sind getrennt. Der erste Plan wurde im gemeinsamen Chat erstellt. Eine automatische KI-Anbindung ist noch nicht konfiguriert. Spätere Pläne können anhand einer vorbereiteten Anfrage erstellt und als validiertes JSON übernommen werden.

Die Rezeptauswahl erzeugt aus gewählten Gerichten und gemeinsamer Portionszahl eine Einkaufsliste. Gleiche Zutaten mit gleicher Einheit werden addiert. Auswahl, Portionen und Häkchen werden privat gespeichert.

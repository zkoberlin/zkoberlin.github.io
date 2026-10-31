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

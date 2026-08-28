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

# Schnittstellen- und Sicherheitsregister

Stand: 27.08.2026

Dieses Register beschreibt die externen Datenflüsse des Hubs und seiner Unterseiten. Es dokumentiert keine Secret-Werte. Öffentlich ausgelieferter Browser-Code wird grundsätzlich als öffentlich einsehbar behandelt.

## Risikostufen

- **Kritisch:** privater Inhalt oder schreibender Zugriff ohne belastbare Authentifizierung
- **Hoch:** Zugangsdaten im Browser oder Repository, beziehungsweise externe Daten werden ungeprüft als HTML ausgegeben
- **Mittel:** Verfügbarkeit, Datenschutz oder Lieferkettensicherheit hängen von einem Drittanbieter ab
- **Niedrig:** ausschließlich öffentliche, lesende Daten mit begrenzter Auswirkung

## Eigene Cloudflare-Schnittstellen

Der Worker `paul-gateway-v2` ist seit dem 26.08.2026 der einzige öffentliche Einstiegspunkt für Hub und KalenderPaul. Das Frontend sendet das Google-OAuth-Token als Bearer-Token; der Gateway prüft Identität und freigegebene E-Mail-Adresse. Erst danach leitet er private Anfragen über das Cloudflare Service Binding `BACKEND` an `kalender-proxy` weiter. Die öffentliche `workers.dev`-Adresse von `kalender-proxy` ist deaktiviert (`workers_dev: false`), der Worker bleibt intern über das Service Binding erreichbar.

| Schnittstelle | Verwendung | Zugriff | Daten | Schutz heute | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- | --- |
| `paul-gateway-v2 /feeds/gmail` | Hub und KalenderPaul | Lesen | private Kalendertermine | Google-Authentifizierung; Upstream-URL als Backend-Secret; internes Service Binding | **Niedrig:** Token- und Fehlerfälle beim Abschnittstest weiter prüfen. |
| `paul-gateway-v2 /feeds/hellomed` | Hub und KalenderPaul | Lesen | private Kalendertermine | Google-Authentifizierung; Upstream-URL als Backend-Secret; internes Service Binding | **Niedrig:** wie Gmail-Feed regelmäßig live prüfen. |
| `paul-gateway-v2 /feeds/kids` | Hub und KalenderPaul | Lesen | privater Aufenthaltsplan | Google-Authentifizierung; Tabellen-URL als Backend-Secret; internes Service Binding; Backend liefert nur validiertes Schema aus Datum und Zuordnung für ein begrenztes Zeitfenster; Kommentare und übrige Sheet-Spalten bleiben intern | **Niedrig:** unbekannte Zuordnungen werden sichtbar als offen behandelt und nicht erraten. |
| `paul-gateway-v2 /feeds/alma` | Hub | Lesen | private Besuchszeiträume | Google-Authentifizierung; Kalender-URLs bleiben Backend-Secrets; internes Service Binding; serverseitige Filterung liefert ausschließlich Beginn und Ende relevanter Alma-/Schwerin-Besuche in einem begrenzten Zeitfenster. Titel, Beschreibungen und andere Termine werden nicht ausgegeben. | **Niedrig:** Besuchserkennung beruht weiterhin auf kontrollierten Begriffen im privaten Kalender. |
| `paul-gateway-v2 /feeds/calendar-preview` | Hub | Lesen | private Terminvorschau | Google-Authentifizierung; Kalender-URLs bleiben Backend-Secrets; maximal 60 Termine im begrenzten Vorschauzeitraum mit Datum, optionaler Uhrzeit, bereinigtem Titel und kontrollierter Kategorie. Orte, Beschreibungen und übrige iCal-Felder werden verworfen. | **Niedrig:** kontrollierte Kategorien regelmäßig anhand neuer Terminarten prüfen. |
| `paul-gateway-v2 /calendar-preferences` | Hub | Lesen, Schreiben | sichtbare Kalenderkategorien | Google-Authentifizierung; validierte Kategorienauswahl wird in D1 gespeichert und geräteübergreifend geladen. | **Niedrig:** keine Kalenderinhalte in der Präferenztabelle. |
| `paul-gateway-v2 /snapshot` | KalenderPaul | Lesen und Schreiben | Kalender-Snapshot | Google-Authentifizierung; KV, Größen- und JSON-Prüfung; internes Service Binding | **Mittel:** Rate Limit und Konfliktverhalten ergänzen beziehungsweise testen. |
| `paul-gateway-v2 /auth/me` | Hub und KalenderPaul | Lesen | Google-Kontoprofil zur Sitzungsprüfung | Google-Tokenprüfung und E-Mail-Allowlist | **Niedrig:** abgelaufene und widerrufene Tokens gezielt testen. |
| `paul-gateway-v2 /trailyx-preview` | Hub | Lesen | nächste und letzte Reise mit Zeitraum, Gesamtdistanz und verwendeten Verkehrsmitteln sowie Jahreswerte | Google-Authentifizierung; minimiertes Schema v2; internes Service Binding und separates Integrationssecret; keine Notizen, Fotos, Etappendetails oder Reiseliste | **Niedrig:** unauthentifizierten Zugriff und Schema bei Releases erneut prüfen. |
| `paul-gateway-v2 /alcohol` | Hub | Lesen, Schreiben und Löschen | persönliche Konsumdaten in Cloudflare D1 | Google-Authentifizierung; serverseitiger Getränkekatalog; D1 nur als Worker-Binding; kein persistenter Browsercache; fehlende Tage gelten als alkoholfrei | **Niedrig:** Rate Limit und regelmäßige D1-Sicherung ergänzen. |
| `paul-gateway-v2 /horoscope` | Hub | Lesen; Backend schreibt Cache | generierter öffentlicher Text | Anthropic-Schlüssel als Backend-Secret; Berliner Tagesdatum; validierter Tagescache; letzter gültiger Text und fünfminütiger Fehler-Backoff | **Niedrig:** öffentliche Nutzung und Anbieterlimits beobachten. |
| `paul-gateway-v2 /market/*` | Hub | Lesen | öffentliche Kurse, privater Anbieterzugang | Finnhub-Schlüssel als Backend-Secret; Finnhub und Yahoo nur serverseitig; Symbol-Allowlist; KV-Cache | **Niedrig:** Anbieterlimits und veraltete Cache-Antworten weiter beobachten. |

Der frühere frei parametrierbare `/ical`-Proxy ist entfernt.

## Hub-Schnittstellen

| Dienst | Zweck | Zugriff | Daten / Zugang | Fallback und Cache | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- | --- |
| lokale Dateien unter `data/` | Namenstage, Geburtstage, Ferientermine, Union, Transfers, Tageshinweise | Lesen | öffentlich | Tageshinweise mit validiertem Schema, Kategorie, Region und optionaler Quelle; teilweise API-Fallback; Browsercache | **Niedrig:** verbleibende Dateien ebenfalls auf versionierte Schemas umstellen. |
| Open-Meteo | Wetter und Vorhersage | Lesen | Berlin oder nach bewusster Freigabe auf zwei Dezimalstellen gerundete Standortkoordinaten | 15-Minuten-Sitzungscache, automatischer Refresh, veralteter Cache bei Ausfall | **Niedrig:** sichtbare Quellenangabe aktiv; Anbieterbedingungen regelmäßig prüfen. |
| Nominatim / OpenStreetMap über eigenes Backend | Ortsname zum freigegebenen Wetterstandort | Lesen | auf zwei Dezimalstellen gerundete Koordinaten | 30-Tage-KV-Cache, Symbol-/Werteprüfung, sichtbare OSM-Namensnennung | **Niedrig:** Anbieterpolicy und Cachewirkung regelmäßig prüfen. |
| Wikimedia/Wikipedia | Tagesereignisse und Geburtstags-Pipeline | Lesen | öffentliche Daten | Geschichtsereignis mit Schema-, Text-, Jahres- und URL-Prüfung, stabile Tagesauswahl und lokaler letzter gültiger Wert; validierte lokale Geburtstagsdatei | **Niedrig:** externe Texte werden über sichere DOM-Methoden ausgegeben und sichtbar zugeordnet. |
| Nameday API V2 | Namenstags-Pipeline | Lesen, nur in GitHub Actions | öffentliche deutsche Namenstage | Browser liest ausschließlich die validierte lokale Jahresdatei; vollständiger Altbestand bleibt bei API-Ausfall erhalten. Live-Prüfung am 27.08.2026: Anbieter antwortete mit HTTP 502, Grundbestand blieb unverändert. | **Niedrig:** monatlichen Lauf und Anbieterstatus beobachten. |
| OpenHolidays | Berliner Feiertags- und Schulferien-Pipelines | Lesen | öffentliche Daten | Beide Datenbestände werden für aktuelles und folgendes Jahr vollständig validiert, atomar ersetzt und lokal ausgeliefert. Der Browser kontaktiert OpenHolidays nicht direkt. | **Niedrig:** automatisierte Aktualisierung und sichtbaren Datenstand regelmäßig kontrollieren. |
| CoinGecko | Bitcoin-Kurs | Lesen | öffentliche Marktdaten | Anzeige fällt aus | **Niedrig:** Cache und Datenzeitpunkt anzeigen. |
| Finnhub | Aktienkurse | Lesen | API-Zugang als Backend-Secret | fünf Minuten KV-Cache, älterer Cache bei Anbieterausfall | **Niedrig:** Anbieterlimits und Datenalter weiter beobachten. |
| Yahoo Finance über eigenes Backend | Kurs-Fallback und europäische Listings | Lesen | serverseitiger Abruf ausschließlich erlaubter Depot-Symbole | fünf Minuten KV-Cache, älterer Cache bei Anbieterausfall | **Niedrig:** Verfügbarkeit und Antwortschema regelmäßig testen. |
| EZB | Wechselkurse | Lesen | öffentliche Marktdaten | Standardwerte / Anzeige fällt aus | **Niedrig:** Cache und Datenzeitpunkt dokumentieren. |
| Google Favicons, Wikimedia, FotMob, Transfermarkt-CDN | Logos und Bilder | Lesen | öffentliche Bilddaten | Emoji/Platzhalter | **Mittel:** Remote-Hosts reduzieren oder Assets lokal spiegeln. |
| Google Fonts und cdnjs/Chart.js | Schriftarten und Laufzeitbibliothek | Lesen | Drittanbieterressourcen | keine lokale Kopie | **Mittel:** selbst hosten oder Integrität und CSP sauber konfigurieren. |

## KalenderPaul-Schnittstellen

| Dienst | Zweck | Zugriff | Daten / Zugang | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- |
| Google Identity Services und Calendar API | Termine bearbeiten | OAuth, Schreiben | öffentlicher OAuth-Client, Benutzer-Token im Arbeitsspeicher | **Hoch:** erlaubte Origins/Redirects prüfen, minimale Scopes verwenden und Fehlerfälle dokumentieren. |
| OpenHolidays | Feiertage und Schulferien | Lesen | öffentlich | **Niedrig:** ausschließlich automatisierte, validierte lokale Dateien; letzter gültiger Browsercache dient als Ausfallreserve. |
| OpenLigaDB | Union-Spielplan | Lesen | öffentlich | **Niedrig:** lokale `union.json` als verlässliche Primärquelle prüfen. |
| Cloudflare-Gateway und internes Kalender-Backend | private Feeds, Kids und Snapshot | Lesen/Schreiben | siehe eigene Cloudflare-Schnittstellen | Google-Authentifizierung aktiv; Backend nicht öffentlich erreichbar. **Offen:** Rate Limit und Konfliktfälle beim Snapshot. |

## FinanzenPaul-Schnittstellen

| Dienst | Zweck | Zugriff | Daten / Zugang | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- |
| JSONBin | Finanzdaten synchronisieren | Lesen, Schreiben, Löschen | Master-Key und Bin-ID in `localStorage` | **Kritisch:** Schlüssel aus dem Browser entfernen, rotieren und Zugriff über authentifizierten Worker kapseln. |
| Google Favicons | Anbieterlogos | Lesen | angefragte Domains | **Mittel:** unnötige Drittanbieteraufrufe vermeiden oder Icons lokal speichern. |

## Automatische Aktualisierungen

| Pipeline | Anbieter | Secret-Namen | Ausgabe | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- |
| Geburtstage | Wikipedia mit Lebendstatus-, Alters-, Länder- und Schema-Prüfung | keine | `data/geburtstage.json` | Nationalitäten werden nur aus eindeutigen Kurzbeschreibungen abgeleitet; mehrere Länder sind möglich, unklare Fälle bleiben leer. Letzte gültige Datei bleibt bei Pipelinefehler erhalten. |
| Feiertage Berlin | OpenHolidays | keine | `data/feiertage_berlin.json` | aktuelles und folgendes Jahr, Pflichtfeiertage und Berlin-Gültigkeit geprüft; atomarer Austausch. |
| Namenstage | Nameday API V2 | keine | `data/namenstage.json` | exakt 366 validierte Tage, atomarer Austausch; letzter vollständiger Bestand bleibt bei jedem Teilausfall erhalten. |
| Schulferien Berlin | OpenHolidays | keine | `data/schulferien_berlin.json` | Schema, Region, Zeitraum, Pflichtferien, Quelle und Datenstand werden geprüft; Austausch erfolgt atomar und der letzte gültige Bestand bleibt bei jedem Fehler erhalten. Der Browser nutzt ausschließlich die lokale Datei oder deren letzten validierten Cache. |
| Union | RapidAPI und football-data.org | `RAPIDAPI_KEY`, `FOOTBALLDATA_KEY` | `data/union.json` | Schlüssel am 26.08.2026 rotiert; RapidAPI-BASIC-Monatskontingent derzeit ausgeschöpft (HTTP 429). Bestehende JSON-Daten bleiben bis zum nächsten erfolgreichen Lauf erhalten. |
| Transfers | RapidAPI | `RAPIDAPI_KEY` | `data/transfers.json` | fest codierter Fallback entfernt und Schlüssel am 26.08.2026 rotiert; Aktualisierung derzeit durch das ausgeschöpfte BASIC-Monatskontingent blockiert (HTTP 429). |

## Übergreifende Sicherheitsmaßnahmen

1. Private Worker-Routen mit echter Identität schützen; Origin-Prüfung nur zusätzlich verwenden.
2. Bereits öffentlich gewordene API-Schlüssel rotieren und ausschließlich als Secrets speichern.
3. Schreiboperationen authentifizieren, validieren und rate-limitieren.
4. Externe Inhalte nicht ungeprüft mit `innerHTML` rendern.
5. Content Security Policy schrittweise einführen und Inline-Skripte/-Handler entfernen.
6. Drittanbieter-Skripte lokal hosten oder mit Subresource Integrity absichern.
7. Einheitlichen Fetch-Wrapper für Timeout, Statusprüfung, Retry, Cache und nutzerfreundliche Fehler verwenden.
8. Für jede Schnittstelle einen Live- und Ausfalltest definieren.

## Empfohlene Reihenfolge

1. Finanzdaten-Zugang hinter eine geschützte Serverschnittstelle verlagern.
2. Finanzzugänge rotieren und serverseitig kapseln.
3. Snapshot-Zugriff mit Rate Limit und sauberem Konfliktverhalten härten.
4. XSS-Flächen und externe Ressourcen mit CSP härten.
5. Hub-Code nach Datenbereich modularisieren und gemeinsame Infrastruktur einführen.

## Live-Verifikation des Gateways

Am 26.08.2026 wurde die veröffentlichte GitHub-Pages-Version gemeinsam im Browser geprüft:

- Anmeldung lädt Gmail-, HelloMed- und Kids-Daten.
- Die Anmeldung bleibt nach einem Seiten-Refresh für die Browsersitzung erhalten.
- Private Gateway-Pfade antworten ohne Bearer-Token mit `401 Unauthorized`.
- Öffentliche Pfade für Horoskop und Marktdaten antworten über `paul-gateway-v2` erfolgreich.
- Der alte öffentliche Direktzugang zu `kalender-proxy` antwortet mit `404`.

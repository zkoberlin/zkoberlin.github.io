# Schnittstellen- und Sicherheitsregister

Stand: 26.08.2026

Dieses Register beschreibt die externen Datenflüsse des Hubs und seiner Unterseiten. Es dokumentiert keine Secret-Werte. Öffentlich ausgelieferter Browser-Code wird grundsätzlich als öffentlich einsehbar behandelt.

## Risikostufen

- **Kritisch:** privater Inhalt oder schreibender Zugriff ohne belastbare Authentifizierung
- **Hoch:** Zugangsdaten im Browser oder Repository, beziehungsweise externe Daten werden ungeprüft als HTML ausgegeben
- **Mittel:** Verfügbarkeit, Datenschutz oder Lieferkettensicherheit hängen von einem Drittanbieter ab
- **Niedrig:** ausschließlich öffentliche, lesende Daten mit begrenzter Auswirkung

## Eigene Cloudflare-Schnittstellen

| Schnittstelle | Verwendung | Zugriff | Daten | Schutz heute | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- | --- |
| `kalender-proxy /feeds/gmail` | Hub und KalenderPaul | Lesen | private Kalendertermine | feste Upstream-URL als Worker-Secret; CORS-Originliste | **Kritisch:** CORS ist keine Authentifizierung. Cloudflare Access oder signierte Sitzung ergänzen. |
| `kalender-proxy /feeds/hellomed` | Hub und KalenderPaul | Lesen | private Kalendertermine | feste Upstream-URL als Worker-Secret; CORS-Originliste | **Kritisch:** wie Gmail-Feed authentifizieren. |
| `kalender-proxy /feeds/kids` | KalenderPaul | Lesen | private Familientermine | Tabellen-URL als Worker-Secret; CORS-Originliste | **Kritisch:** authentifizieren und minimale erforderliche Felder ausliefern. |
| `kalender-proxy /snapshot` | KalenderPaul | Lesen und Schreiben | Kalender-Snapshot | KV, Größen- und JSON-Prüfung, CORS-Originliste | **Kritisch:** Schreib- und Lesezugriff authentifizieren; Rate Limit ergänzen. |
| `kalender-proxy /horoscope` | Hub | Lesen; Worker schreibt Cache | generierter öffentlicher Text | Anthropic-Schlüssel als Worker-Secret, KV-Cache | **Mittel:** Rate Limit und klaren Fehler-/Cachepfad ergänzen. |
| `kalender-proxy /market/*` | Hub | Lesen | öffentliche Kurse, privater Anbieterzugang | Finnhub-Schlüssel als Worker-Secret, Symbol-Allowlist, KV-Cache | **Mittel:** eigener Schlüssel am 26.08.2026 rotiert; Anbieterlimits weiter beobachten. |

Der frühere frei parametrierbare `/ical`-Proxy ist entfernt.

## Hub-Schnittstellen

| Dienst | Zweck | Zugriff | Daten / Zugang | Fallback und Cache | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- | --- |
| lokale Dateien unter `data/` | Namenstage, Geburtstage, Ferientermine, Union, Transfers, Sondertage | Lesen | öffentlich | teilweise API-Fallback; Browsercache | **Niedrig:** Schema und Aktualitätsdatum je Datei dokumentieren. |
| Open-Meteo | Wetter und Vorhersage | Lesen | Standortkoordinaten | Browser-Geolocation, Berlin-Fallback | **Mittel:** Datenschutztext und Cache-/Timeoutstrategie festhalten. |
| Nominatim / OpenStreetMap | Rückwärts-Geocodierung | Lesen | Standortkoordinaten | nur bei erfolgreicher Geolocation | **Mittel:** Nutzungsrichtlinie, Kontaktkennung und Aufrufhäufigkeit prüfen. |
| Wikimedia/Wikipedia | Tagesereignisse und Geburtstage | Lesen | öffentliche Daten | lokale Geburtstagsdatei beziehungsweise Ausblenden | **Niedrig:** externe Texte vor DOM-Ausgabe sicher behandeln. |
| Nameday APIs und AllOrigins | Namenstag-Fallback | Lesen | öffentliche Daten | mehrere Anbieter | **Mittel:** öffentlichen CORS-Proxy entfernen; lokale Datei als alleinige Quelle bevorzugen. |
| OpenHolidays | Schulferien-Fallback | Lesen | öffentliche Daten | lokale Ferien-Datei | **Niedrig:** lokale Datei bevorzugen und Aktualität anzeigen. |
| CoinGecko | Bitcoin-Kurs | Lesen | öffentliche Marktdaten | Anzeige fällt aus | **Niedrig:** Cache und Datenzeitpunkt anzeigen. |
| Finnhub | Aktienkurse | Lesen | API-Zugang als Worker-Secret | KV-Cache und Yahoo-Fallback | **Mittel:** Schlüssel am 26.08.2026 rotiert; öffentlichen Proxy-Fallback später durch eigenen Worker ersetzen. |
| Yahoo Finance über öffentliche CORS-Proxys | Kurs-Fallback | Lesen | Depot-Symbole werden an Proxys übertragen | mehrere Proxyanbieter | **Hoch:** eigenen Worker verwenden; öffentliche Proxys entfernen. |
| EZB | Wechselkurse | Lesen | öffentliche Marktdaten | Standardwerte / Anzeige fällt aus | **Niedrig:** Cache und Datenzeitpunkt dokumentieren. |
| Google Sheet für Familienrhythmus | Hub-Anzeige | Lesen | Tabellen-ID im Browser | keine belastbare Zugriffsschicht | **Hoch:** über authentifizierten Worker ausliefern. |
| Google Apps Script Alkohol-Tracker | Datensynchronisation | Lesen, Schreiben, Löschen | persönliche Gesundheits-/Konsumdaten; öffentliche Script-URL | `localStorage` als Offlinekopie | **Kritisch:** authentifizieren, Eingaben serverseitig validieren und hinter Worker verlagern. |
| Google Favicons, Wikimedia, FotMob, Transfermarkt-CDN | Logos und Bilder | Lesen | öffentliche Bilddaten | Emoji/Platzhalter | **Mittel:** Remote-Hosts reduzieren oder Assets lokal spiegeln. |
| Google Fonts und cdnjs/Chart.js | Schriftarten und Laufzeitbibliothek | Lesen | Drittanbieterressourcen | keine lokale Kopie | **Mittel:** selbst hosten oder Integrität und CSP sauber konfigurieren. |

## KalenderPaul-Schnittstellen

| Dienst | Zweck | Zugriff | Daten / Zugang | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- |
| Google Identity Services und Calendar API | Termine bearbeiten | OAuth, Schreiben | öffentlicher OAuth-Client, Benutzer-Token im Arbeitsspeicher | **Hoch:** erlaubte Origins/Redirects prüfen, minimale Scopes verwenden und Fehlerfälle dokumentieren. |
| OpenHolidays | Feiertage und Schulferien | Lesen | öffentlich | **Niedrig:** Timeout, Cache und lokales Fallback vereinheitlichen. |
| OpenLigaDB | Union-Spielplan | Lesen | öffentlich | **Niedrig:** lokale `union.json` als verlässliche Primärquelle prüfen. |
| Cloudflare-Kalender-Proxy | private Feeds, Kids und Snapshot | Lesen/Schreiben | siehe eigene Cloudflare-Schnittstellen | **Kritisch:** gemeinsame Authentifizierung einführen. |

## FinanzenPaul-Schnittstellen

| Dienst | Zweck | Zugriff | Daten / Zugang | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- |
| JSONBin | Finanzdaten synchronisieren | Lesen, Schreiben, Löschen | Master-Key und Bin-ID in `localStorage` | **Kritisch:** Schlüssel aus dem Browser entfernen, rotieren und Zugriff über authentifizierten Worker kapseln. |
| Google Favicons | Anbieterlogos | Lesen | angefragte Domains | **Mittel:** unnötige Drittanbieteraufrufe vermeiden oder Icons lokal speichern. |

## Automatische Aktualisierungen

| Pipeline | Anbieter | Secret-Namen | Ausgabe | Risiko / nächster Schritt |
| --- | --- | --- | --- | --- |
| Geburtstage | Wikidata/Wikipedia | keine | `data/geburtstage.json` | Schema-/Plausibilitätsprüfung ergänzen. |
| Namenstage | Nameday API | keine | `data/namenstage.json` | Quelle und letztes erfolgreiches Update erfassen. |
| Schulferien | OpenHolidays | keine | `data/schulferien_berlin.json` | letztes erfolgreiches Update erfassen. |
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

1. Authentifizierung für Kalenderfeeds und Snapshot festlegen und umsetzen.
2. Alkohol-Tracker hinter eine geschützte Serverschnittstelle verlagern.
3. Finanz- und Börsenzugänge rotieren und serverseitig kapseln.
4. XSS-Flächen und externe Ressourcen mit CSP härten.
5. Hub-Code nach Datenbereich modularisieren und gemeinsame Infrastruktur einführen.

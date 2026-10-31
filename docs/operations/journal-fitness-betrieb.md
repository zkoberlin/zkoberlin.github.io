# JournalPaul und FitPaul – Betriebshandbuch

Stand: 31.10.2026 · v6.50.0. Bedienung: [Journal](../../journalpaul/README.md), [Fitness](../../fitpaul/README.md). Prüf-/Releasehistorie: [Live-Prüfprotokoll](live-verification-log.md).

## Infrastruktur und private Daten

Statisches Frontend auf GitHub Pages. Privater Worker `paul-gateway-v2` im Verzeichnis `workers/private-gateway`; Konfiguration `wrangler.jsonc`. D1 `paul-hub-private` enthält `life_records` und `life_photos`; R2 `paul-hub-life-photos` enthält private Journalbilder. Keine öffentliche Bucket-Domain aktivieren. Migration: `workers/private-gateway/migrations/0005_life_records.sql`.

Records sind nach geprüftem Konto (`owner`) und Art/ID getrennt. Revisionen verhindern veraltete Schreib-/Löschvorgänge. Persönliche Werte gehören nicht in öffentliche Quellcodedateien, Beispieldaten, Screenshots oder Repository-Dokumente.

| Route | Verwendung |
| --- | --- |
| `GET /life/<kind>` | Eigene Records laden |
| `PUT /life/<kind>/<id>` | Eigenen Record mit Revision speichern |
| `DELETE /life/<kind>/<id>` | Eigenen Record mit Revision löschen |
| `GET /life/export` | Eigene Records/Bildliste für Export |
| `POST /life-photo` | Aufbereitetes Bild in privaten Speicher übernehmen |
| `GET /life-photo/<id>` | Eigenes Bild lesen |
| `DELETE /life-photo/<id>` | Eigenes, nicht mehr referenziertes Bild löschen |

`assets/js/life-api.js` und HubAuth liefern die Anmeldung; keine Token manuell aus dem Browser kopieren. Ohne Anmeldung müssen private Routen `401` liefern. Zulässige Record-Arten und Eingaben werden serverseitig in `src/life.js` geprüft.

## Lokale Vorschau und Tests

Im Checkout starten:

```bash
python3 -m http.server 8000
node --test workers/private-gateway/test/*.test.js
```

Öffentliches HTML lokal auszuliefern erzeugt noch keine erlaubte lokale Google-Anmeldung. Für Layouttests klar bezeichnete synthetische Daten verwenden, die keine echten Daten schreiben. `origin_mismatch` bedeutet, dass der JavaScript-Ursprung nicht zum Google-OAuth-Client passt. Produktive Domain beibehalten; lokale Ursprünge nur bewusst im vorgesehenen OAuth-Client konfigurieren.

Temporäre Vorschauseiten nicht veröffentlichen. Eigene Vorschauprozesse nach Gebrauch stoppen. Offene Benutzerentwürfe in bestehenden Tabs nicht für Layouttests überschreiben oder neu laden.

## Veröffentlichung

1. Aktuellen Branch, Remotezustand, lokale Änderungen und Stashes prüfen. Fremde Änderungen nicht überschreiben; bei isoliertem Release-Checkout Dateien kontrolliert zurücksynchronisieren.
2. Version gemeinsam setzen: `node scripts/release-version.mjs <VERSION>`. Betroffene Inhalte prüfen; erforderliche Tests ausführen.
3. Bei Backendänderungen den Worker mit **expliziter** Konfigurationsdatei bereitstellen. Nicht aus dem Repository-Hauptordner ohne Konfiguration deployen. Erst prüfen, dass Konto, Worker und Bindings stimmen; keine automatische Neuanlage als Ersatz für fehlenden Zugriff.
4. Frontendänderungen über den vorgesehenen GitHub-Pages-Workflow veröffentlichen. Reine CSS-/Frontendänderungen benötigen keinen neuen Worker-Deploy.
5. Erfolgreichen Workflow, öffentliche Versionsdatei und geänderte Live-Dateien prüfen. Private Routen ohne Anmeldung auf `401` prüfen. Relevante angemeldete Flows möglichst testen; nicht ausgeführte Checks ausdrücklich dokumentieren.
6. Ergebnis, Commit, Version, Worker-/Pages-Nachweise und Einschränkungen im Live-Prüfprotokoll ablegen. Persönliche Gesundheits-/Journalinhalte dort weglassen.

## Sicherung und Wiederherstellung

Im Journal bietet „Daten und Fotos exportieren“ einen privaten JSON-Export beider Bereiche einschließlich Fotos. Der Export enthält sensible Daten: außerhalb des Repositorys aufbewahren. Ein reiner D1-Export enthält keine R2-Bilddateien.

Vor administrativen Änderungen D1 separat sichern, etwa mit `wrangler d1 export` unter ausdrücklicher Angabe der richtigen Worker-Konfiguration, Datenbank und eines privaten Ausgabepfads. Vor dem tatsächlichen Aufruf den angemeldeten Cloudflare-Zugang prüfen. Kein erfolgreicher Backup-Nachweis, solange der Export nicht erzeugt und geprüft wurde.

Ein R2-Bucket allein ist kein Backup. Es gibt noch keine automatische unabhängige R2-Sicherung und keinen belegten vollständigen Wiederherstellungstest. Der UI-Export besitzt noch keinen automatischen Restore-Import.

Für einen kontrollierten administrativen Restore zunächst Bildobjekte in den privaten Bucket schreiben und passende `life_photos` mit neuen kontobezogenen Schlüsseln anlegen. Danach Records nur in das überprüfte Zielkonto übernehmen. Vor Überschreiben auf ID-/Revisionskonflikte und Bildreferenzen prüfen. Datenbank und Bildbestand gemeinsam verifizieren.

## Löschen und Upload-Abbrüche

UI-Löschung erst nach Bestätigung. Fotos dürfen nicht entfernt werden, solange ein Journaleintrag sie referenziert. Nach Löschen/Ändern der Referenz werden Bildobjekte getrennt aufgeräumt; Fehler bleiben sichtbar.

Unterbrochene Uploads oder geschlossene Tabs können unreferenzierte Bilder zurücklassen. Vor administrativer Bereinigung privaten Export/Sicherung erstellen und Referenzen prüfen; keine pauschale Bucket-Bereinigung. Entwürfe und bereits erfolgreich hochgeladene Teile bei Wiederholungsversuchen beachten.

## Fehlersuche

| Symptom | Prüfen |
| --- | --- |
| `origin_mismatch` | OAuth-JavaScript-Ursprung, produktive/localhost-Adresse |
| `401` in privater Ansicht | Anmeldung und freigegebenes Konto, nicht den Schutz entfernen |
| Versionskonflikt | Neu laden/aktuellen Datensatz vergleichen; Entwurf vorab sichern |
| HEIC kann nicht geöffnet werden | Browserdekodierung; JPEG/PNG wählen |
| Früher „Ungültiges Bild oder enthaltene Metadaten“ | Bildaufbereitung/aktuellen `photo-format.js`-Stand prüfen; nicht rohe Metadaten ungeprüft zulassen |
| Diktieren nicht verfügbar | Browserunterstützung, Mikrofonfreigabe, Gerät; Gerätediktierfunktion als Alternative |
| Übungsfoto fehlt | Exakte Namenszuordnung in `exercise-photos.js`, lokale Datei und Lizenz; unbekannte Varianten nicht blind zuordnen |
| Rezeptnährwerte unvollständig | BLS-Lebensmittel und Gramm je Portion im separaten Editor prüfen |
| Nächstes Training unerwartet | Aktiver Zyklus, abgeschlossene Krafttrainings, Datum und gewählte Tage; Aktivitäten drehen den Zyklus nicht weiter |

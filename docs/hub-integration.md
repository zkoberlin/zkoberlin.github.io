# Hub-Anbindung von JournalPaul und FitPaul

Stand: 31.10.2026 · v6.50.0.

## Übersicht und Navigation

Hub unter `/`, Journal unter `/journalpaul/`, Fitness unter `/fitpaul/`. Farblich eingerahmte Kacheln im Hub führen zu den eigenständigen Unterseiten; beide besitzen einen Rückweg zum Hub.

Die Journal-Kachel zeigt nach Anmeldung das Datum des letzten Eintrags, keine ausführlichen Journaltexte. FitPaul zeigt Wochentag/Datum und Einheit des nächsten Trainings sowie den letzten Gewichtsstand, sofern vorhanden. Fehlender/abgeschlossener Plan und nicht verfügbare Daten werden ausdrücklich benannt. Hub und FitPaul verwenden dieselbe Berechnung für die nächste Einheit (`TrainingPlan.next`). Ohne Anmeldung keine privaten Vorschauabfragen.

## Gemeinsam genutzte Grundlagen

- Google-Anmeldung über `assets/js/auth.js` und privaten Gateway; keine separate Registrierung je Unterseite.
- `assets/js/life-api.js` für private Records, Fotos und Export. Authentifizierung bleibt dort beziehungsweise in HubAuth; keine Schlüssel oder Sitzungsdaten in Dokumentation kopieren.
- `assets/js/theme.js`: Hell → Dunkel → Auto. Bestehender Schlüssel `hub_theme`; Auto berücksichtigt das Betriebssystem. Gemeinsame Auswahl wird zwischen Seiten/Tabs synchronisiert; blockierter Browserspeicher führt nicht zum Absturz.
- `assets/js/version.js`: gemeinsame sichtbare Version; `scripts/release-version.mjs` aktualisiert Referenzen der Seiten gemeinsam.
- `assets/css/hub.css` für Grundlagen, `assets/css/life.css` für die beiden Bereiche und ihre mobilen Regeln.
- `assets/js/hub-life.js` für die privaten Kachelzusammenfassungen.

## Zufällige Impulse

Seit v6.50.0 ohne Wechselknöpfe in Hub, FitPaul und Journal. Zufällige Auswahl beim Laden/Refresh; derselbe Wert bleibt während normaler Aktualisierungen dieser Seite stabil. Hub wählt weiterhin aus dem zur Tageszeit beziehungsweise zum Wochentag passenden Impulspool. FitPaul nutzt seine 50 Motivationen; Journal seine 50 persönlichen Begrüßungen. Keine garantierte Wiederholungssperre zwischen zwei Aufrufen.

## Speicherung und Kontentrennung

Frontend: statische GitHub-Pages-Dateien. Backend: `workers/private-gateway`/`paul-gateway-v2`. Private Inhalte in D1 (`life_records`, `life_photos`), Bildobjekte in privatem R2. `owner` wird serverseitig aus dem geprüften Konto bestimmt. Jede Lese-/Schreib-/Lösch-/Fotoanfrage prüft die Berechtigung; Revisionen schützen gegen veraltete Schreibvorgänge.

Generische Rezepte, Lebensmittelwerte, Übungshinweise und lizenzierte Beispielfotos sind öffentliche Produktressourcen. Persönliche Tagebücher, Fotos, Gewichte, Trainings und Profile gehören ausschließlich in den privaten Speicher oder einen ausdrücklich privaten lokalen Export.

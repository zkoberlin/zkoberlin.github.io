# Kalender-Proxy Worker

Der Worker stellt die serverseitigen Datenzugriffe für Hub und Kalender bereit.

## Endpunkte

- `GET /feeds/gmail` – privater Gmail-iCal-Feed
- `GET /feeds/hellomed` – privater Hellomed-iCal-Feed
- `GET /feeds/kids` – Kids-Tabelle als CSV
- `GET /snapshot` – Kalender-Snapshot aus KV lesen
- `PUT /snapshot` – Kalender-Snapshot in KV schreiben
- `GET /horoscope` – gecachtes Tageshoroskop
- `GET /ical?url=...` – nur während der Migration; akzeptiert ausschließlich exakt konfigurierte Quellen

## Secrets

Die erforderlichen Secret-Namen stehen in `wrangler.jsonc`. Werte gehören ausschließlich in Cloudflare Worker Secrets oder lokal in die ignorierte Datei `.dev.vars`.

```bash
npm install
npx wrangler secret put ANTHROPIC_API_SECRET
npx wrangler secret put GMAIL_ICAL_URL
npx wrangler secret put HELLOMED_ICAL_URL
npx wrangler secret put KIDS_SHEET_URL
```

## Prüfung und Deployment

```bash
npm run types
npm run check
npm run dev
npm run deploy
```

`npm run deploy` bewahrt während der Migration bereits im Cloudflare-Dashboard gesetzte Bindings mit `--keep-vars`. Das frühere Klartext-Binding wird erst nach einem erfolgreich getesteten Deployment kontrolliert entfernt.

Die Frontend-Migration erfolgt zweistufig: zuerst neue Endpunkte bereitstellen, danach Hub und Kalender umstellen und abschließend den alten `/ical`-Kompatibilitätspfad entfernen.

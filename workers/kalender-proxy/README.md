# Kalender-Proxy Worker

Der Worker stellt die serverseitigen Datenzugriffe für Hub und Kalender bereit.

## Endpunkte

- `GET /feeds/gmail` – privater Gmail-iCal-Feed
- `GET /feeds/hellomed` – privater Hellomed-iCal-Feed
- `GET /feeds/kids` – Kids-Tabelle als CSV
- `GET /snapshot` – Kalender-Snapshot aus KV lesen
- `PUT /snapshot` – Kalender-Snapshot in KV schreiben
- `GET /horoscope` – gecachtes Tageshoroskop
- `GET /market/quote?symbol=...` – Finnhub-Kurs für freigegebene Depot-Symbole
- `GET /market/metric?symbol=...` – Finnhub-Kennzahlen für freigegebene Depot-Symbole
- `GET /auth/me` – prüft ein Google-OAuth-Bearer-Token gegen das freigegebene Konto

## Secrets

Die erforderlichen Secret-Namen stehen in `wrangler.jsonc`. Werte gehören ausschließlich in Cloudflare Worker Secrets oder lokal in die ignorierte Datei `.dev.vars`.

```bash
npm install
npx wrangler secret put ALLOWED_GOOGLE_EMAIL
npx wrangler secret put ANTHROPIC_API_SECRET
npx wrangler secret put FINNHUB_API_SECRET
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

`npm run deploy` bewahrt bereits im Cloudflare-Dashboard gesetzte Secret-Bindings mit `--keep-vars`.

Private Quell-URLs werden ausschließlich über die festen `/feeds/*`-Endpunkte angesprochen. Ein frei parametrierbarer Proxy-Endpunkt wird nicht bereitgestellt.

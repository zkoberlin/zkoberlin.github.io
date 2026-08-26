# Private Gateway

Der Gateway ist der einzige öffentliche Einstiegspunkt für Hub und KalenderPaul. Private Pfade verlangen ein gültiges Google-OAuth-Token des freigegebenen Kontos. Die fachliche Verarbeitung bleibt über ein Cloudflare Service Binding im Worker `kalender-proxy`.

## Öffentliche Pfade

- `/horoscope`
- `/market/quote`
- `/market/metric`

## Geschützte Pfade

- `/feeds/gmail`
- `/feeds/hellomed`
- `/feeds/kids`
- `/snapshot`
- `/auth/me`

Die Frontend-Migration ist seit dem 26.08.2026 abgeschlossen. Hub und KalenderPaul verwenden `paul-gateway-v2.paul-bendzko.workers.dev`. Die öffentliche `workers.dev`-Adresse des Backend-Workers ist deaktiviert; das Service Binding bleibt davon unberührt.

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

Nach erfolgreicher Frontend-Migration wird die öffentliche `workers.dev`-Adresse des Backend-Workers deaktiviert. Das Service Binding bleibt davon unberührt.

# Journal und Fitness betreiben

## Speicherung

D1 `paul-hub-private` enthält `life_records` und `life_photos`. R2 `paul-hub-life-photos` enthält die Bilder. Keine öffentliche Bucket-Domain aktivieren. JSON-Exporte enthalten sensible persönliche Daten und Bilder; außerhalb des Repositorys aufbewahren.

## Sicherung und Wiederherstellung

Vor administrativen Änderungen D1 mit `wrangler d1 export paul-hub-private --remote --output <privater-pfad>` sichern. Das UI bietet einen portablen JSON-Export einschließlich aller eigenen Fotos. Ein R2-Bucket allein ist kein Backup. Es besteht noch keine automatische unabhängige R2-Sicherung.

Für die Wiederherstellung eines Exports zuerst Bildobjekte in den privaten Bucket schreiben und zugehörige `life_photos` mit neuen, kontobezogenen Objektschlüsseln anlegen. Danach Einträge in `life_records` ausschließlich für das überprüfte Zielkonto übernehmen. Vor Überschreiben bestehender Datensätze auf Konflikte prüfen. Ein automatisierter Import und ein vollständiger Wiederherstellungstest sind noch offen.

## Löschen und abgebrochene Uploads

Die Oberfläche löscht Einträge erst nach Bestätigung. Journalbilder werden nach Entfernen der Referenz separat gelöscht. Wird das Löschen eines Bildobjekts unterbrochen, meldet die Oberfläche einen Fehler. Upload-Abbrüche oder das Schließen eines Tabs können unreferenzierte Bilder zurücklassen. Vor administrativer Bereinigung einen privaten Export erstellen und anhand der Journalreferenzen prüfen, welche Bilder nicht mehr verwendet werden. Keine pauschale Bereinigung des Buckets ausführen.

## Releases

Beide Unterseiten verwenden die gemeinsame Hub-Version. Nach jedem Release an- und abgemeldeten Zugriff, neue und bearbeitete Einträge, Bilder, Export und mobile Darstellung prüfen. Ein lokaler OAuth-Fehler `origin_mismatch` bedeutet, dass der aktuelle Browser-Ursprung nicht im Google-OAuth-Client freigegeben ist. Die produktive Domain beibehalten; lokale Vorschau benötigt separat freigegebene Ursprünge.

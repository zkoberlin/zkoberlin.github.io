CREATE TABLE IF NOT EXISTS life_records (
 owner TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL,
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL,
 PRIMARY KEY(owner, kind, id)
);
CREATE TABLE IF NOT EXISTS life_photos (
 owner TEXT NOT NULL, id TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(owner,id)
);

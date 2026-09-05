CREATE TABLE IF NOT EXISTS hub_sessions (
  session_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hub_sessions_expires_at
  ON hub_sessions (expires_at);

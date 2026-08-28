CREATE TABLE IF NOT EXISTS finance_state (
  state_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL CHECK (length(payload_json) <= 100000),
  source_updated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

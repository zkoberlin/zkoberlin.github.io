CREATE TABLE IF NOT EXISTS hub_preferences (
  preference_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (length(value_json) <= 4000),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

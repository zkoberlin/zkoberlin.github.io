CREATE TABLE IF NOT EXISTS alcohol_entries (
  entry_id TEXT PRIMARY KEY,
  occurred_on TEXT NOT NULL CHECK (
    length(occurred_on) = 10 AND
    substr(occurred_on, 5, 1) = '-' AND
    substr(occurred_on, 8, 1) = '-'
  ),
  occurred_time TEXT NOT NULL DEFAULT '00:00',
  drink_code TEXT NOT NULL,
  label TEXT NOT NULL,
  standard_units REAL NOT NULL CHECK (standard_units >= 0),
  source_timestamp INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alcohol_entries_occurred_on
  ON alcohol_entries (occurred_on DESC, occurred_time DESC);

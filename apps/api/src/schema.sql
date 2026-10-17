CREATE TABLE IF NOT EXISTS household (
  id TEXT PRIMARY KEY,
  time_zone TEXT NOT NULL DEFAULT 'UTC'
);
CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id),
  role TEXT NOT NULL CHECK (role IN ('reader','grown_up')),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  pin_hash TEXT,
  pin_failed_count INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TEXT
);
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

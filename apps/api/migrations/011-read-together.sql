-- Time two readers of a household spent reading together, and the household's helper reward
-- (docs/detailed-designs/reading-log/read-together, ADR-0018). One row per session, whoever logs it: the kind and
-- logged_by say who the helper is. A removed session keeps its row with removed_at set. Helper minutes are summed on
-- read from the sessions logged since given_at, never stored. Both cascade from the household like every table.
CREATE TABLE reading_session (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  logged_by TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('read-to', 'helped', 'read-to-me')),
  minutes INTEGER NOT NULL CHECK (minutes BETWEEN 5 AND 180),
  read_on TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  confirmed_at TEXT,
  removed_at TEXT,
  CHECK (logged_by <> partner_id)
);
CREATE INDEX reading_session_household ON reading_session (household_id, logged_at);

-- earned_at and earned_by describe the round under way; given_at is when the last round was given.
CREATE TABLE helper_reward (
  household_id TEXT PRIMARY KEY REFERENCES household(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_minutes INTEGER NOT NULL CHECK (target_minutes BETWEEN 30 AND 600),
  earned_at TEXT,
  earned_by TEXT REFERENCES profile(id) ON DELETE SET NULL,
  given_at TEXT
);

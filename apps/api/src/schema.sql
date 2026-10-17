CREATE TABLE IF NOT EXISTS household (
  id TEXT PRIMARY KEY,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  theme TEXT NOT NULL DEFAULT 'device' CHECK (theme IN ('device','light','dark'))
);
CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id),
  role TEXT NOT NULL CHECK (role IN ('reader','grown_up')),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
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
CREATE TABLE IF NOT EXISTS book (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id),
  title TEXT NOT NULL,
  author TEXT,
  chapter_count INTEGER NOT NULL CHECK (chapter_count >= 1),
  cover_color TEXT NOT NULL,
  sticker TEXT NOT NULL,
  added_by_role TEXT NOT NULL DEFAULT 'grown_up',
  created_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS chapter_log (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES book(id),
  chapter_number INTEGER NOT NULL,
  read_on TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  undo_until TEXT NOT NULL,
  reviewed_at TEXT,
  sticker TEXT,
  note TEXT,
  feedback_seen_at TEXT,
  UNIQUE (book_id, chapter_number)
);
CREATE TABLE IF NOT EXISTS reward (
  book_id TEXT PRIMARY KEY REFERENCES book(id),
  text TEXT NOT NULL,
  note TEXT,
  given_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS answer (
  id TEXT PRIMARY KEY,
  chapter_log_id TEXT NOT NULL REFERENCES chapter_log(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  text TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS device (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS password_reset (
  token_hash TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS question (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES book(id),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  removed_at TEXT
);

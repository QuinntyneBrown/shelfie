-- The first schema, as the SQLite release stored it: TEXT ids and ISO-8601 TEXT timestamps.
-- Every child table cascades from its parent so that deleting a household erases everything it owns.
CREATE TABLE household (
  id TEXT PRIMARY KEY,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  theme TEXT NOT NULL DEFAULT 'device' CHECK (theme IN ('device','light','dark'))
);
CREATE TABLE profile (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('reader','parent')),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  password_hash TEXT
);
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  remember INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE book (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  chapter_count INTEGER NOT NULL CHECK (chapter_count >= 1),
  cover_color TEXT NOT NULL,
  sticker TEXT NOT NULL,
  added_by_role TEXT NOT NULL DEFAULT 'parent',
  created_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE TABLE chapter_log (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
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
CREATE TABLE reward (
  book_id TEXT PRIMARY KEY REFERENCES book(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  note TEXT,
  given_at TEXT NOT NULL
);
CREATE TABLE answer (
  id TEXT PRIMARY KEY,
  chapter_log_id TEXT NOT NULL REFERENCES chapter_log(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  text TEXT NOT NULL
);
CREATE TABLE password_reset (
  token_hash TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE question (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES book(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  removed_at TEXT
);
CREATE TABLE invites (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  invited_by TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE sign_in_attempt (
  source TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX book_household ON book (household_id);
CREATE INDEX chapter_log_reviewed ON chapter_log (reviewed_at);
CREATE UNIQUE INDEX profile_email ON profile (email);
CREATE UNIQUE INDEX profile_username ON profile (lower(username));
CREATE INDEX profile_household ON profile (household_id);
CREATE INDEX session_profile ON session (profile_id);
CREATE INDEX password_reset_profile ON password_reset (profile_id);
CREATE INDEX question_book ON question (book_id);
CREATE INDEX answer_chapter_log ON answer (chapter_log_id);
CREATE INDEX invites_household ON invites (household_id);
CREATE INDEX sign_in_attempt_source ON sign_in_attempt (source);

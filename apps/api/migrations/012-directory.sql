-- Authors and reading volunteers: grown-up accounts outside any household (ADR-0019). They share
-- profile, sign-in, sessions and password reset with parents; only these two roles have no household.
ALTER TABLE profile ALTER COLUMN household_id DROP NOT NULL;
ALTER TABLE profile DROP CONSTRAINT profile_role_check;
ALTER TABLE profile ADD CONSTRAINT profile_role_check CHECK (role IN ('reader','parent','author','volunteer'));
ALTER TABLE profile ADD CONSTRAINT profile_household_by_role CHECK ((household_id IS NULL) = (role IN ('author','volunteer')));

-- What an author or volunteer shows parents, and whether the operator has listed it (ADR-0021).
-- It cascades from its profile, so erasing the account erases it.
CREATE TABLE directory_profile (
  profile_id TEXT PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','hidden')),
  bio TEXT NOT NULL DEFAULT '',
  website TEXT,
  ages TEXT,
  contact TEXT,
  updated_at TEXT NOT NULL
);

-- An author's catalogue: books parents can copy onto their household's shelf (ADR-0023). Nothing in a
-- household points back here, so editing, removing or erasing touches no household.
CREATE TABLE catalogue_book (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  chapter_count INTEGER NOT NULL CHECK (chapter_count BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX catalogue_book_profile ON catalogue_book (profile_id);

-- A catalogue book's cover picture, re-encoded as the household covers are (320 × 480 WebP, no metadata).
CREATE TABLE catalogue_cover (
  book_id TEXT PRIMARY KEY REFERENCES catalogue_book(id) ON DELETE CASCADE,
  image BYTEA NOT NULL,
  etag TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

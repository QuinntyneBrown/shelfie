-- Authors and reading volunteers: grown-up accounts outside any household (ADR-0018). They share
-- profile, sign-in, sessions and password reset with parents; only these two roles have no household.
ALTER TABLE profile ALTER COLUMN household_id DROP NOT NULL;
ALTER TABLE profile DROP CONSTRAINT profile_role_check;
ALTER TABLE profile ADD CONSTRAINT profile_role_check CHECK (role IN ('reader','parent','author','volunteer'));
ALTER TABLE profile ADD CONSTRAINT profile_household_by_role CHECK ((household_id IS NULL) = (role IN ('author','volunteer')));

-- What an author or volunteer shows parents, and whether the operator has listed it (ADR-0020).
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

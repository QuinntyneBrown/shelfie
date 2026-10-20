-- A parent's e-mail is confirmed by a single-use link mailed at sign-up (docs/detailed-designs/sign-in/verify-email).
-- Every parent who exists already counts as confirmed; only sign-up starts one unconfirmed.
ALTER TABLE profile ADD COLUMN email_verified_at TEXT;
UPDATE profile SET email_verified_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') WHERE role = 'parent' AND email IS NOT NULL;

-- Only the SHA-256 of a link's token is stored. Issuing a new link deletes the parent's unused ones.
CREATE TABLE email_verification (
  token_hash TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX email_verification_profile ON email_verification (profile_id);

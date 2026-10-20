-- A parent's link to a Google or Facebook account (docs/detailed-designs/sign-in/sign-in-with-google-or-facebook,
-- ADR-0018): the provider's stable subject id, so a parent who changes their e-mail at the provider still signs in.
-- At most one profile per provider account; a profile may link one account per provider. The row cascades with the
-- profile and so with the household.
CREATE TABLE profile_provider (
  provider TEXT NOT NULL CHECK (provider IN ('google','facebook')),
  subject TEXT NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE INDEX profile_provider_profile ON profile_provider (profile_id);

-- A person's own photo, as the API re-encoded it: 256 × 256 WebP without metadata (ADR-001 in
-- docs/detailed-designs/settings/upload-profile-photo). It cascades from its profile, which cascades
-- from its household, so erasing a household erases its photos in the same statement.
CREATE TABLE profile_photo (
  profile_id TEXT PRIMARY KEY REFERENCES profile(id) ON DELETE CASCADE,
  image BYTEA NOT NULL,
  etag TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

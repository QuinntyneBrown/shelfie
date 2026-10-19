-- A gallery reward's description and pictures (docs/detailed-designs/review/reward-gallery, ADR-0011). An empty
-- description means none. Each picture is stored as the API re-encoded it: 480 × 480 WebP without metadata. The partial
-- unique index lets a reward have at most one featured picture; the service keeps exactly one while it has any.
-- Pictures cascade from their reward, which cascades from its household.
ALTER TABLE gallery_reward ADD COLUMN description TEXT NOT NULL DEFAULT '';
CREATE TABLE reward_picture (
  id TEXT PRIMARY KEY,
  reward_id TEXT NOT NULL REFERENCES gallery_reward(id) ON DELETE CASCADE,
  image BYTEA NOT NULL,
  etag TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TEXT NOT NULL
);
CREATE INDEX reward_picture_reward ON reward_picture (reward_id);
CREATE UNIQUE INDEX reward_picture_featured ON reward_picture (reward_id) WHERE featured;

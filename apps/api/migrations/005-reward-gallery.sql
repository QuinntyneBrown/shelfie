-- The household's reward gallery (docs/detailed-designs/review/reward-gallery, ADR-0009). picked_at marks the one reward
-- its readers are reading toward; books finished from then on count. It cascades from the household like every table.
CREATE TABLE gallery_reward (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target INTEGER NOT NULL CHECK (target BETWEEN 1 AND 20),
  created_at TEXT NOT NULL,
  picked_at TEXT
);
CREATE INDEX gallery_reward_household ON gallery_reward (household_id);
CREATE UNIQUE INDEX gallery_reward_goal ON gallery_reward (household_id) WHERE picked_at IS NOT NULL;

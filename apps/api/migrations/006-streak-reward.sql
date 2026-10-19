-- A reward the parent sets for a reading-streak milestone (docs/detailed-designs/review/streak-rewards, ADR-0012).
-- earned_at is stored the first time a read sees the streak at the milestone, because the streak itself forgets
-- when it breaks; given_at marks the parent giving it. It cascades from the household like every table.
CREATE TABLE streak_reward (
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL CHECK (milestone IN (7, 30, 100)),
  name TEXT NOT NULL,
  earned_at TEXT,
  given_at TEXT,
  PRIMARY KEY (household_id, milestone)
);

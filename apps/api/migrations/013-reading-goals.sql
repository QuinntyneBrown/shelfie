-- Reading goals (docs/detailed-designs/community/reading-goals, ADR-0021): a number of finished books by an end date,
-- for one household or one community, at most one each. Days are YYYY-MM-DD; both owners cascade.
CREATE TABLE reading_goal (
  id TEXT PRIMARY KEY,
  household_id TEXT REFERENCES household(id) ON DELETE CASCADE,
  community_id TEXT REFERENCES community(id) ON DELETE CASCADE,
  target INTEGER NOT NULL CHECK (target BETWEEN 1 AND 1000),
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK ((household_id IS NULL) <> (community_id IS NULL))
);
CREATE UNIQUE INDEX reading_goal_household ON reading_goal (household_id) WHERE household_id IS NOT NULL;
CREATE UNIQUE INDEX reading_goal_community ON reading_goal (community_id) WHERE community_id IS NOT NULL;

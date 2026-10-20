-- Streak healing (docs/detailed-designs/reading-log/heal-streak, ADR-0021). The parent names one activity on the
-- household (null means healing is off) and heals one missed day a week. week_of is the Monday of healed_on, so the
-- unique key is the once-a-week rule; activity keeps the name the day was healed with. Both cascade from the household.
ALTER TABLE household ADD COLUMN healing_activity TEXT;
CREATE TABLE streak_heal (
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  healed_on TEXT NOT NULL,
  week_of TEXT NOT NULL,
  activity TEXT NOT NULL,
  healed_at TEXT NOT NULL,
  PRIMARY KEY (household_id, healed_on),
  UNIQUE (household_id, week_of)
);

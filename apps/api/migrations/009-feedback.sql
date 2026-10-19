-- Feedback a reader or parent sends from the account menu (docs/detailed-designs/shell/send-feedback, ADR-0014).
-- Read only by the operator through the admin API. It cascades from the household and the profile like every table.
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('feel', 'idea')),
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  message TEXT CHECK (char_length(message) <= 1000),
  created_at TEXT NOT NULL,
  CHECK (score IS NOT NULL OR message IS NOT NULL)
);
CREATE INDEX feedback_created_at ON feedback (created_at);

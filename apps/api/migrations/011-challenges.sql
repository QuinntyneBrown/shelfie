-- Household reading challenges (docs/detailed-designs/review/run-challenges, ADR-0018). Counts are computed on read;
-- only when a challenge closed, the last leader announced and its reward are stored.

-- The reader who logged a chapter, so a challenge can tell siblings apart. Null for a parent's log. A household with one
-- reader is given her older logs; elsewhere older logs count for no one.
ALTER TABLE chapter_log ADD COLUMN reader_id TEXT REFERENCES profile(id) ON DELETE SET NULL;
UPDATE chapter_log c SET reader_id = r.id
  FROM book b, profile r
 WHERE b.id = c.book_id AND r.household_id = b.household_id AND r.role = 'reader'
   AND (SELECT COUNT(*) FROM profile p WHERE p.household_id = b.household_id AND p.role = 'reader') = 1;

CREATE TABLE challenge (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  measure TEXT NOT NULL CHECK (measure IN ('chapters', 'books')),
  goal INTEGER NOT NULL CHECK (goal BETWEEN 1 AND 500),
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ended_at TEXT,
  leader_id TEXT REFERENCES profile(id) ON DELETE SET NULL,
  reward_text TEXT,
  reward_note TEXT,
  rewarded_at TEXT
);
-- One open challenge per household (L2-138).
CREATE UNIQUE INDEX challenge_active ON challenge (household_id) WHERE ended_at IS NULL;
CREATE INDEX challenge_household ON challenge (household_id);

CREATE TABLE challenge_reader (
  challenge_id TEXT NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_id, profile_id)
);

-- Two more household notification choices, both on at first (L2-145).
ALTER TABLE household
  ADD COLUMN notify_challenge_lead BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_challenge_end BOOLEAN NOT NULL DEFAULT TRUE;

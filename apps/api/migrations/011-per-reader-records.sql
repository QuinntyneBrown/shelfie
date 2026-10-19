-- Each reader has her own records (docs/detailed-designs/settings/per-reader-records, ADR-0018). A book belongs to one
-- reader; its chapter logs, answers, questions, reward and cover follow it. The household's first reader is the one
-- whose name sorts first (then id): profiles store no creation time, and it is the reader the app showed until now.
CREATE FUNCTION first_reader(household TEXT) RETURNS TEXT LANGUAGE sql STABLE AS
  $$ SELECT id FROM profile WHERE household_id = household AND role = 'reader' ORDER BY name, id LIMIT 1 $$;

ALTER TABLE book ADD COLUMN reader_id TEXT REFERENCES profile(id) ON DELETE CASCADE;
UPDATE book SET reader_id = first_reader(household_id);
CREATE INDEX book_reader ON book (reader_id);

-- A writer that names no reader (the SQLite import, shelfie-admin, older scripts) adds the book for the first reader.
CREATE FUNCTION book_default_reader() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reader_id IS NULL THEN
    NEW.reader_id := first_reader(NEW.household_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER book_default_reader BEFORE INSERT ON book FOR EACH ROW EXECUTE FUNCTION book_default_reader();

-- A streak reward is set once per household and earned and given once per reader.
CREATE TABLE streak_reward_earned (
  household_id TEXT NOT NULL,
  milestone INTEGER NOT NULL,
  reader_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  earned_at TEXT NOT NULL,
  given_at TEXT,
  PRIMARY KEY (reader_id, milestone),
  FOREIGN KEY (household_id, milestone) REFERENCES streak_reward(household_id, milestone) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);
INSERT INTO streak_reward_earned (household_id, milestone, reader_id, earned_at, given_at)
  SELECT household_id, milestone, first_reader(household_id), earned_at, given_at FROM streak_reward
   WHERE earned_at IS NOT NULL AND first_reader(household_id) IS NOT NULL;
UPDATE streak_reward SET earned_at = NULL, given_at = NULL;

-- A writer that still sets streak_reward.earned_at or given_at writes the first reader's state, so the old columns
-- never hold a second truth.
CREATE FUNCTION streak_reward_legacy_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.earned_at IS NOT NULL AND first_reader(NEW.household_id) IS NOT NULL THEN
    INSERT INTO streak_reward_earned (household_id, milestone, reader_id, earned_at, given_at)
      VALUES (NEW.household_id, NEW.milestone, first_reader(NEW.household_id), NEW.earned_at, NEW.given_at)
      ON CONFLICT (reader_id, milestone) DO UPDATE SET earned_at = EXCLUDED.earned_at, given_at = EXCLUDED.given_at;
  END IF;
  NEW.earned_at := NULL;
  NEW.given_at := NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER streak_reward_legacy_state BEFORE INSERT OR UPDATE ON streak_reward FOR EACH ROW EXECUTE FUNCTION streak_reward_legacy_state();

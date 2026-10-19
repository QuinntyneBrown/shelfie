-- An optional amount in whole dollars beside a streak reward's name, shown on the reader's badge (L2-112).
ALTER TABLE streak_reward ADD COLUMN amount INTEGER CHECK (amount BETWEEN 1 AND 1000);

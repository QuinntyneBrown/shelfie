-- A browser's address for push messages, so the API can tell a parent or reader something while Shelfie is closed
-- (docs/detailed-designs/shell/push-notifications, ADR-0015). It belongs to the profile that stored it and reaches its
-- household through the profile, so removing either removes it.
CREATE TABLE push_subscription (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX push_subscription_profile ON push_subscription (profile_id);

-- Which events send a notification, for the whole household; all start on (L2-123).
ALTER TABLE household
  ADD COLUMN notify_chapter_logged BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_feedback BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_book_reward BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_streak_reward BOOLEAN NOT NULL DEFAULT TRUE;

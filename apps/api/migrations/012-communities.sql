-- Communities of households (docs/detailed-designs/community/manage-communities, ADR-0020). A member shows only the
-- display name it chose for that community; the household that joined first manages it. Memberships cascade from the
-- household; a community left with no member is deleted by the leave route, and by the runbook after an erasure.
CREATE TABLE community (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE community_member (
  community_id TEXT NOT NULL REFERENCES community(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (community_id, household_id)
);
CREATE INDEX community_member_household ON community_member (household_id);

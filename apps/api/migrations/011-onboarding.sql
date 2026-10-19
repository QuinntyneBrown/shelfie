-- Whether the household has been through the one-time set-up wizard after sign-up
-- (docs/detailed-designs/sign-in/onboard-household, ADR-0018). Every household that exists already, is seeded or is
-- imported is done; only sign-up starts one as FALSE, and POST /api/settings/onboarded sets it TRUE.
ALTER TABLE household ADD COLUMN onboarded BOOLEAN NOT NULL DEFAULT TRUE;

# ADR-0018: The set-up wizard is a full-screen page, gated by a household flag, over the existing reader and reward routes

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-137, L2-138, L2-140, L2-141, L2-142, L2-143

## Context

A parent who signs up lands on Review's empty state and has to find Settings to add the child and a reward. A one-time wizard should take them through that set-up and never show again. Three questions decide its shape: where "done" is kept, which API creates the reader and the rewards, and whether the wizard is a dialog over the shell or a page of its own. The `onboarding` feature library may depend only on `components` and `core` (AGENTS.md), and the auth layout the wizard needs lived in the `sign-in` library.

## Decision

1. **Done is a column on the household.** Migration `011-onboarding.sql` adds `household.onboarded BOOLEAN NOT NULL DEFAULT TRUE`; sign-up inserts `FALSE`; every household that already exists, is seeded or is imported is done. `GET /api/session` carries `onboarded`, and `POST /api/settings/onboarded` (parent only, own household) is the single write. No browser storage is used for the wizard's state.
2. **The existing routes create everything.** The wizard posts to `POST /api/readers` and `POST /api/gallery-rewards` with the same bodies as the Settings dialogs. There is no wizard-specific create route and no change to those routes' validation.
3. **A full-screen page, one URL per step.** `OnboardingPage` in the new `onboarding` library sits in `sh-auth-layout` at `/onboarding`, `/onboarding/child`, `/onboarding/sign-in`, `/onboarding/reward` and `/onboarding/done`. It is not a dialog over Review. A reload reads the household's readers and gallery and shows the step the URL names, or the earliest step whose needs are met.
4. **`sh-auth-layout` moves to the `components` library** so the `onboarding` library can compose it without depending on `sign-in`.
5. **The password lives in memory only** and is shown once, on All set.

## Consequences

- The wizard is once per household on any device, and no current user ever sees it, because the migration's default marks every existing household done.
- Sign-up, sign-in and `signedOutGuard` route a parent to `/onboarding` while the household is pending; the three places share the one `onboarded` field.
- The reader and reward rules have one implementation; a change to a username rule or a reward limit changes the wizard too.
- A reload on the sign-in step loses the typed name, since nothing is kept in the browser; the parent types it again.
- The five auth pages import `AuthLayout` from `components` instead of a sibling folder; nothing else in `sign-in` changes.
- Rewards added in the wizard have no pictures or description; Settings adds them.

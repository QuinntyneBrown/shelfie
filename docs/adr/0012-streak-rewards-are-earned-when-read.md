# ADR-0012: Streak rewards are earned when read and stored once earned

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-100, L2-101, L2-103, L2-104

## Context

Item 1 of `docs/feature-enhancements.md` asks for parent-set rewards that unlock at streak milestones of 7, 30 and 100 days. The streak is derived and never stored (`L2-020`, `streak.ts`), so on its own it forgets: once it breaks, the fact that it reached 7 is gone. A reward earned must not be taken back. The `reward` table is keyed by book (`reward.book_id`), and Give a reward, the trophy shelf and `shelfie-admin books reward` must stay as they are (ADR-0009).

## Decision

1. **Its own table.** `streak_reward(household_id, milestone, name, earned_at, given_at)` with the primary key `(household_id, milestone)` and `milestone` limited to 7, 30 and 100. A row exists only while the parent has set a reward for that milestone. It cascades from the household, so the operator's erasure statement needs no change.
2. **Earned when read, then stored.** Every read of the streak rewards, of the shelf and of Review first runs one idempotent `UPDATE` that sets `earned_at` on the household's rows whose milestone is at or below the current streak and have none. The streak is still derived; only the fact "this was reached" is stored. No background job and no hook in the chapter log.
3. **Earned once, given once.** `earned_at` is never cleared, and a row with `given_at` can no longer be edited or removed (409 `already-given`), so a given reward stays on her shelf. Each milestone is therefore one reward for the life of the household.
4. **Giving is one call.** `POST /api/streak-rewards/:milestone/give` sets `given_at` for an earned reward (400 `not-earned`, 409 `already-given`). There is no note and no dialog; it is a button on Review.
5. **Parents change, both roles read.** `GET` is open to readers and parents, because the shelf shows it; `PUT`, `DELETE` and `give` use `requireRole('parent')`.

## Consequences

- A streak that rises to a milestone and breaks again before anyone opens the shelf, Review or Settings is missed. The reader opens her shelf after every chapter she logs, so a day-7 streak is seen the day it happens.
- Earning happens on a read, so a `GET` writes. The write is idempotent, bounded to three rows and safe to repeat.
- The reward is free text typed once by the parent; changing it before it is given is allowed, and the reader sees the new name.
- A reward set when the streak is already above the milestone is earned at once, which the parent may not expect; the Settings row says when Nia gets it.
- The fixed milestones (7, 30, 100) are code. Custom milestones, repeating rewards and streak freezes (feature-enhancements item 13) are not built.

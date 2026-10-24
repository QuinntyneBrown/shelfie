# ADR-0021: The parent heals one missed day a week from Review, and a healed day counts for the streak only

- Status: Accepted
- Date: 2026-10-20
- Requirements: L2-160, L2-161, L2-162, L2-163, L2-164

## Context

The reading streak is derived from the days a chapter was logged (`L2-020`, `streak.ts`); one missed day sets it back to 0. A reader sometimes misses a day for a good reason: she read half a chapter and never got to the questions, or the tablet ran out of charge. The streak-healing prompt of 20 Oct 2026 asks for one missed day a week to be healed by a reading-related activity the parent names, without changing how chapters are logged, the badges or the streak reward milestones. It leaves who heals, which days and how the week is counted to the implementer, as long as the choice is recorded.

## Decision

1. **The parent heals, from Review.** A "Heal a missed day" card on Review names the day and the activity with one "Heal it" button; there is no confirm dialog, because the card already says what will happen and giving a streak reward is the same one tap. The reader cannot heal (403 `grown-ups-only`): the parent is the one who checks the activity happened, and a reader-side request for the parent to approve is deferred.
2. **One activity, a column on the household.** `household.healing_activity TEXT NULL`, set by `PUT /api/streak-healing/activity` with the streak reward name's rules (trimmed, 1 to 100 characters) and cleared by `DELETE`. Null means healing is off. One activity needs no table of its own.
3. **Heals in their own table, one per week by a unique key.** `streak_heal(household_id, healed_on, week_of, activity, healed_at)` with the primary key `(household_id, healed_on)` and `UNIQUE (household_id, week_of)`, where `week_of` is the Monday of `healed_on`. The database refuses a second heal in the same week even when two requests race; the API answers 409 `already-healed-this-week`. The row copies the activity's name, so removing or renaming the activity never undoes a heal or changes how a healed day reads. It cascades from the household, so the erasure statement needs no change.
4. **Which days are healable.** A day with no chapter logged, among the 7 days before today in the household's time zone, whose Monday-to-Sunday week has no heal yet. The week is the healed day's week, not the week the parent heals in, so the Sunday of last week can still be healed on Monday. Today cannot be healed, because the reader still has today to read. Anything else answers 400 `not-healable`, as does a heal with no activity set. Review offers the latest healable day, which is nearly always yesterday.
5. **Healed days join the streak in `streak.ts` only.** `streakFor` counts the union of the read days and the healed days, so every caller (shelf, Review, the chapter success card's streak number, streak rewards) gets the healed streak with no code of its own, and streak rewards are earned from it (`L2-101`). `weekFor` marks a healed day that has no chapter with `healed: activity` for the shelf's `sh-week-strip`; the chapter success card asks for the week without heals, because its row is the reader's own reading. `badges.ts` keeps reading `chapter_log` only, and no book or chapter count reads `streak_heal` (`L2-163`).
6. **Both roles read, parents change.** `GET /api/streak-healing` answers `{ activity }` to either role; `PUT`, `DELETE` and `POST /heals` use `requireRole('parent')`. The heal card's data travels in `GET /api/review` as `heal: { day, activity } | null`.

## Consequences

- A heal is final: there is no un-heal. A parent who heals the wrong day waits for next week; un-healing was not asked for.
- Logging a chapter later on a healed day makes it an ordinary read day; the heal row stays and still uses that week's heal, and the streak does not change.
- Healing a day that is not in the middle of a streak gains nothing; the card offers the latest missed day, which is the one that bridges the current streak.
- The streak number on the chapter success card counts healed days while its week row does not, so on a healed week the two can differ by the healed day. This follows the prompt's rule that the success card's reading days are real reading only.
- More than one activity, more than one heal a week or a parent-set allowance, push notifications about heals and healing through `shelfie-admin` are not built.

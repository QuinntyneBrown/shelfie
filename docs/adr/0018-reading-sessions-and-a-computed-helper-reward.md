# ADR-0018: Reading sessions in their own table and a helper reward computed from them

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-137, L2-138, L2-141, L2-142, L2-146

## Context

Readers want to log time spent reading with a sister, and the one who reads aloud or helps should earn toward a "helper" reward. Everything else Shelfie stores about reading belongs to the household: `book` and `chapter_log` name no reader (`001-initial.sql`). A session names two readers, has minutes rather than a chapter, and may be logged from either side. The helper reward repeats: after it is given the count starts again. The streak rewards (ADR-0012) already show a reward that is earned on read and given with one call.

## Decision

1. **Sessions in their own table.** `reading_session(household_id, logged_by, partner_id, kind, minutes, read_on, logged_at, confirmed_at, removed_at)`, cascading from the household and from both profiles. Nothing is added to `chapter_log`, so chapters, streaks, badges and goals cannot count a session by accident.
2. **One row per session, whoever logs it.** The kind (`read-to`, `helped`, `read-to-me`) and `logged_by` fix the helper: `logged_by` for the first two, `partner_id` for the third. The other reader's "That’s right" sets `confirmed_at` on the same row and never adds one.
3. **Minutes are computed on read.** A helper's minutes are the sum over the household's sessions that are not removed and were logged after the reward's last `given_at`. No running total is stored, so a removed session or a changed target is reflected at the next read.
4. **The helper reward is modelled on streak rewards.** `helper_reward(household_id PRIMARY KEY, name, target_minutes, earned_at, earned_by, given_at)`. Every read earns first: when a helper's minutes reach the target, `earned_at` and `earned_by` are stored, so removing a session later does not take it back. `POST /api/helper-reward/give` sets `given_at` and clears `earned_at` and `earned_by` in one statement, which starts the next round.
5. **Readers log, parents change.** Only readers log, and only sessions they are in; only parents set or give the reward or remove a session. Removal sets `removed_at` rather than deleting.

## Consequences

- The shelf, Review and the reward reads sum a household's sessions each time; a household logs at most ten per reader per day, so the sum stays small.
- A reward set when a reader already has enough minutes is earned at the next read, as with streak rewards.
- Only the last give is kept (`given_at`); a history of rounds is not built.
- Per-reader targets, more than one helper reward and sessions with a parent are not built and would need new columns or tables.

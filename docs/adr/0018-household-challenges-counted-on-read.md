# ADR-0018: Household challenges are counted on read, one at a time, from logs that name their reader

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-137, L2-138, L2-139, L2-142, L2-145, L2-146

## Context

Parents want to run a time-boxed reading race between the readers of their household and see who is ahead (`docs/detailed-designs/review/run-challenges`). L1-012 and L2-006 keep every household's data to itself. The data a leaderboard would count already exists: `chapter_log` rows and `book.finished_at`. But books and chapter logs belong to the household, not to a reader, so nothing says which sibling logged which chapter. Badges, the streak and the reward gallery are all derived on read (ADR-0011, ADR-0012) rather than stored.

## Decision

1. **Household only.** A challenge belongs to one household (`challenge.household_id`, cascading), its readers are readers of that household, and every route scopes by the session's household. Comparing households is not built.
2. **Counted on read.** No count, rank or winner is stored. Every read of the challenges counts chapter logs and finished books whose logged day, in the household time zone, falls in the window, and ranks them. Only the facts a read cannot recover are stored: when the challenge closed (`ended_at`), the last leader announced (`leader_id`, so a lead notification is sent once), and the reward.
3. **Logs name their reader.** `chapter_log.reader_id` is filled from the reader's session when she logs a chapter. This is the one new piece of data the feature records; it is the id of the signed-in reader who already performed the action, and it is erased with the household. In a household with exactly one reader the migration gives her the older logs; elsewhere older logs count for no one. A book counts for the reader who logged its last chapter.
4. **One at a time.** A partial unique index `challenge (household_id) WHERE ended_at IS NULL` lets a household hold one open challenge; creating a second answers 409 `challenge-running`.
5. **Ended on read, notified once.** There is no scheduler. A challenge whose last day has passed is closed by the next read (the shelf, Review or the next chapter logged) with `UPDATE … WHERE ended_at IS NULL RETURNING id`, and each returned id sends one end notification. End now closes it the same way and makes today its last day.

## Consequences

- A `GET` can write (closing an expired challenge), as with streak rewards; the write is idempotent.
- The end notification can arrive later than the end date if nobody opens Shelfie; readers open their shelf most days.
- Households with several readers have no per-reader history before this release, so the first insights cover less than two weeks.
- Readers still share one shelf, and a chapter is logged once per household; challenges do not change that model.
- The rest of Shelfie ignores `reader_id`: the queue, the streak, badges and rewards are unchanged.

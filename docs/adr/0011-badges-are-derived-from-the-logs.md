# ADR-0011: Achievement badges are derived from the chapter logs, not stored

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-096, L2-097, L2-098, L2-099

## Context

Item 2 of `docs/feature-enhancements.md` asks for badges for feats such as two chapters in one day, a first book and a weekend of reading. A badge could be stored when it is earned, or worked out when it is shown. The streak (`L2-020`) is already derived and never stored, per household, and a reader's chapter logs can be removed by Undo for a short time (`L2-011`).

## Decision

1. **Badges are derived.** `badges.ts` works out the four badges on every read of `GET /api/shelf` and `GET /api/review` from `chapter_log.read_on` and `book.finished_at`. There is no table, no column and no endpoint that writes a badge.
2. **The set is fixed in code.** First book, Double chapter, Weekend reader and Week streak, always in that order. Parents cannot add or edit badges; a new badge is a code change with its own requirement.
3. **A badge is earned on the day its feat first happened.** The API returns that day, so the shelf and Review show the same date. Days are the read dates she chose; the finished day is taken in the household time zone, as the streak's "today" is.
4. **Badges belong to the household,** like the streak and the goal, because readers share one shelf.
5. **The API returns the copy.** Each badge carries its icon, name and hint, so the shelf and Review libraries show the same words without sharing a constants file.

## Consequences

- No migration, nothing to back up or erase beyond the logs themselves, and no way for a badge to drift from the logs.
- Undoing a log within its window can take back a badge that log alone earned. This is the price of deriving; it is stated in `L2-096` and is rare because Undo lasts seconds.
- Two small queries per read of the shelf or Review (the read dates, the finished dates), both over rows the same request already reads.
- A badge cannot be "seen" or "new": nothing records when the reader looked at it. A celebration for a newly earned badge would need stored state and is deferred.
- Badges for a single reader would need readers on chapter logs first, as for the goal (ADR-0009).

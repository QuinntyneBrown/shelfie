# ADR-0009: One goal per household, counted from the pick and completed by the existing reward

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-081, L2-083, L2-087, L2-088, L2-089

## Context

Item 7 of `docs/feature-enhancements.md` asks for a reward gallery: the parent curates rewards, the reader picks the one she is reading toward and sees her progress to it. Four questions needed an answer before anything could be built: whose goal it is, what "progress" counts, how a reached goal is given without a second reward flow, and how a goal ends.

The rest of Shelfie fixes the frame. A household is the unit of tenancy and its readers share one shelf (`GET /api/shelf` takes no reader). A reward belongs to one finished book (`reward.book_id` is the key), and Give a reward (`L2-017`), the trophy shelf (`L2-018`) and `shelfie-admin books reward` (`L2-061`) must stay as they are.

## Decision

1. **The goal belongs to the household.** The pick is a nullable `picked_at` on the household's `gallery_reward` rows, with a partial unique index (`household_id` where `picked_at IS NOT NULL`) so a household has at most one goal. There is no separate goal table and no per-reader column, because nothing else in Shelfie is per reader either.
2. **Progress is the books finished since the pick.** It is counted, never stored: the household's books whose `finished_at` is at or after `picked_at`. Picking another reward, or the same one again, sets a new `picked_at` and so starts again at 0. Editing a target changes what the goal needs at once; removing the reward removes the goal with its row.
3. **The goal book is the one that reached the target.** Ordered by `finished_at`, the book at position `target` is the goal book. The goal is reached when that book exists.
4. **The reward is given through the existing flow.** Review marks the goal book's existing "finished, no reward yet" card, and its Give a reward opens the unchanged dialog with the goal's name typed in. The only change to the dialog is that optional initial text; the endpoint, its validation, the one-reward-per-book rule and the trophy shelf are untouched.
5. **A goal ends when its goal book has a reward.** The gallery read reports no goal once a `reward` row exists for the goal book, whether the parent gave the goal's name, changed it, or used the CLI. Nothing writes when the goal ends, so the reward flows need no hook into the gallery.
6. **Readers and parents may pick; only parents change the gallery.** Picking needs a session of the household; adding, editing and removing use `requireRole('parent')`, as every other household setting does.

## Consequences

- One new table (`005-reward-gallery.sql`), cascading from the household, so the operator's erasure statement in `docs/runbook.md` erases the gallery with no change.
- The goal and its progress are derived on every read, so they cannot drift from the books and rewards they summarise. The cost is two small queries per read of `GET /api/gallery-rewards` and `GET /api/review`.
- A household with two readers shares one goal. Per-reader goals would need readers on books and chapter logs first, which is outside this feature.
- After the goal book is rewarded the row keeps its `picked_at` until the next pick. It is read as "no goal"; nothing else reads `picked_at`.
- If the parent gives the goal book a different reward, the goal still ends: the book has had its one reward. The dialog says what the goal was, so this is the parent's choice, not an accident.
- History of past goals, several goals at once, reward pictures and ordering are not built (deferred in the feature request).

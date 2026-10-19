# ADR-0018: A book belongs to one reader, and every reading record follows the book

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-137 to L2-144

## Context

A parent can already add several readers (`L2-036`), but everything a reader does is stored and counted per household: `book` and `chapter_log` (`apps/api/migrations/001-initial.sql`) have no reader column, and the shelf, the streak, the badges, Review and the certificate all filter on `b.household_id` or take "the first reader by name". With two readers, Nia would see Theo's books and Theo would share Nia's streak.

Two shapes were possible: a book owned by one reader, or books shared by the household with progress kept per reader. The second needs a per-reader copy of every chapter log, reward, finish date and certificate, and changes every query and screen; the first changes one table.

## Decision

1. **`book.reader_id`.** Migration `011-readers-and-communities.sql` adds `book.reader_id` referencing `profile(id) ON DELETE CASCADE`. A book belongs to exactly one reader. `chapter_log`, `answer`, `question`, `reward`, `book_cover`, `finished_at`, the certificate and the trophy shelf already follow the book, so none of them changes. Two siblings reading the same title each get their own copy.
2. **Existing books go to the household's first reader.** The migration sets `reader_id` on every existing book to the household's reader that sorts first by name, then id. The prompt asked for the reader created first, but `profile` has no creation time and its ids are random UUIDs; the name order is the one Review, Books and Manage book already use to pick "the reader", so nothing a family sees moves. A household with no reader keeps its books unassigned (`reader_id` NULL).
3. **A book added without a reader goes to the first reader.** A `BEFORE INSERT` trigger fills a missing `reader_id` with the household's first reader by the same rule. This keeps every existing writer of `book` working unchanged: the one-reader web app, `import-sqlite.ts`, `shelfie-admin` and the test fixtures. Unassigned books of a household that had no reader are adopted by the first reader the parent adds.
4. **Who sees what.** A reader's session sees only her own books and everything under them; another reader's book in the same household answers 404, as another household's does (`L2-084`). A parent sees every reader's books. Shelf, Review and the books list take an optional `reader` query parameter for a parent and default to the first reader, so a one-reader household calls the same URLs with the same results.
5. **Streaks and badges are per reader.** `streakFor` and `badgesFor` take the reader; they are still derived from her chapter logs and finished books (ADR-0011).
6. **Streak rewards: defined per household, earned per reader.** `streak_reward` keeps one row per household and milestone with its name and amount (ADR-0012). Earning and giving move to `streak_reward_earned(reader_id, milestone, household_id, earned_at, given_at)`; the old `earned_at` and `given_at` move to the household's first reader and are dropped from `streak_reward`. Each reader earns the 7-day reward once and is given it once. A reward can no longer be renamed or removed once any reader has been given it (409 `already-given`, as before).
7. **The reward-gallery goal stays one per household** (`L2-086` to `L2-089`, ADR-0009). Books finished by any reader count toward it. A goal per reader is deferred.
8. **Notifications follow the book.** A sticker, a note or a book reward is pushed to the devices of the reader who owns the book, and a streak reward to the reader who earned it, not to every reader of the household. The messages themselves are unchanged (`L2-125` to `L2-127`).

## Consequences

- One reader's household behaves exactly as before: the trigger fills the reader, the default reader is the only reader and no picker shows.
- Deleting a reader would now delete her books through the cascade; deleting a reader is not built and stays deferred.
- Moving a book to another reader and books shared between readers are not built.
- Household erasure is unchanged: the books still cascade from the household through `household_id`.

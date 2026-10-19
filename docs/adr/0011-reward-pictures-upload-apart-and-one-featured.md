# ADR-0011: Reward pictures upload one at a time, apart from saving the reward, and the featured mark lives on the picture row

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-100, L2-101, L2-100, L2-101

## Context

A gallery reward gains a description and up to six pictures, one of which is featured (`L1-021`, `L2-099` to `L2-101`). Two questions needed an answer before anything could be built: how pictures travel from the Add / edit a reward dialog to the API, and how the API stores which picture is featured so that a reward can never have two.

The rest of Shelfie fixes the frame. Profile photos and book covers travel as the raw body of one request each, read by `readImage` (5 MB) and re-encoded by `processImage` (`photos.service.ts`); `POST /api/gallery-rewards` takes JSON through `express.json` with a 16 kB limit. Add a book already sends its picture after the book exists (`docs/detailed-designs/books/upload-book-cover/adr-001-send-the-add-book-picture-after-the-book.md`). The one goal per household is already enforced by a partial unique index (ADR-0009).

For the upload, three ways were considered: one multipart request carrying the reward and every picture; uploading to a holding area and passing tokens with the reward; or one request per picture against a saved reward. For the featured mark, two: a `featured_picture_id` column on `gallery_reward`, or a `featured` flag on each `reward_picture` row.

## Decision

1. **One request per picture, against a saved reward.** `POST /api/gallery-rewards/{id}/pictures` takes one picture as the raw body through `readImage` and `processImage(bytes, 480, 480)`, and answers the whole reward. Removing (`DELETE …/pictures/{pictureId}`) and featuring (`POST …/pictures/{pictureId}/feature`) are requests of their own and answer the whole reward too. Editing a reward, each change is sent the moment the parent makes it, independent of "Save changes", which still saves only the name, description and target.
2. **Adding a reward sends its pictures after it.** Before "Add reward" the dialog keeps the chosen files in memory with object-URL previews. After `POST /api/gallery-rewards` answers with the id, it uploads them in the order chosen and features the chosen one if it is not the first, following the Add a book precedent. If a picture fails, the reward stays added and the dialog goes on as the edit dialog of that reward with the failed picture's Try again.
3. **The featured mark is a flag on the picture row, at most one per reward by a partial unique index.** `reward_picture.featured BOOLEAN`, with `CREATE UNIQUE INDEX reward_picture_featured ON reward_picture (reward_id) WHERE featured`. The database itself refuses a second featured picture.
4. **Every change to a reward's pictures runs in a transaction that locks the reward row first** (`SELECT … FOR UPDATE`, scoped by household). That serialises concurrent uploads, removals and feature changes for one reward, so the limit of 6 holds, the first picture is featured, removing the featured one features the oldest left, and featuring clears the old mark before setting the new one.

## Consequences

- One image pipeline: reward pictures get the type-by-content check, the 5 MB and 40 MP limits, WebP re-encoding and metadata stripping of `L2-044`, `L2-045` and `L2-048` with no new code, and the same error copy.
- No multipart parser and no holding area: nothing to expire and no new dependency. The reward's JSON route keeps its 16 kB limit.
- Each picture shows its own progress and its own failure with Try again (`L2-101`); a failed picture never loses the name, description or the other pictures.
- Picture changes while editing are saved even if the parent then presses Cancel. The dialog tells the Settings page after each change, so the row always shows the stored featured picture.
- A reward can be added and its pictures fail; the parent sees that at once in the dialog, which has become the edit dialog, and can retry or leave it.
- The `featured_picture_id` alternative would also allow at most one, but needs a foreign key from `gallery_reward` to `reward_picture` and back, a composite key to keep the picture on its own reward, and care when deleting. The flag and partial index match ADR-0009's goal index and cascade cleanly.
- "Exactly one when there are pictures" is a service rule, not a constraint; the row lock makes it hold under concurrency, and the API tests check it.
- Deleting the reward or erasing the household removes the pictures through `ON DELETE CASCADE`; the operator's erasure statement in `docs/runbook.md` is unchanged.

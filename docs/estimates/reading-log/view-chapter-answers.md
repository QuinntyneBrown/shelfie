# Estimate — View chapter answers

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient`, the `sh-cover`, `sh-skeleton`, `sh-error-state`, `sh-button` and `sh-top-bar` components, and the `platform/` middleware are assumed present from the `platform`, `shell`, `sign-in` and `books` subsystems. The `chapters` module, its tables and `ChaptersApi` are assumed present from log-chapter; the `reviewed_at`, `sticker` and `note` columns are written by review/review-chapter. The shelf banner that `feedback_seen_at` clears is estimated in review/review-chapter. [Detailed design](../../detailed-designs/reading-log/view-chapter-answers/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `ChapterPage` with `loading`, `error`, `pending` and reviewed states, header date copy, answers list and footer actions | 3 |
| `ChaptersApi.chapter` and `ChaptersApi.markSeen` with the `ChapterView` type | 1 |
| `GET /api/chapter-logs/:id`: router, service (household check, answers, review block, next chapter), repo | 2 |
| `POST /api/chapter-logs/:id/seen`: router, service, conditional update | 1 |
| Playwright acceptance tests via `ChapterPage` page object (pending, reviewed, read-only, seen call, error) | 2 |
| **Total** | **9** |

## Minimal scope

The page with read-only answers and the pending or reviewed state over `GET /api/chapter-logs/:id`, without the seen call (the shelf banner then stays until review/review-chapter clears it another way) and without the "Chapter N+1" footer link. This still satisfies all three criteria of `L2-012` and defers nothing from it; it defers the clearing half of `L2-016` to review/review-chapter. Total: 7 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `POST .../seen` and the `feedbackSeenAt` handling | The new-feedback banner on the shelf does not clear on opening the chapter (`L2-016` criterion 2) | 1 |
| Drop the "Chapter N+1" footer link and `nextChapterLogId` | Reader goes back to the book page to open the next chapter | 1 |

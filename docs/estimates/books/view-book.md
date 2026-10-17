# Estimate — View a book

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient`, the `platform/` middleware, `sh-cover`, `sh-progress`, `sh-reward-card`, `sh-skeleton` and `sh-error-state` (view-shelf) are assumed present. The log form and the sent-answers page the rows link to are owned by reading-log. The collapse threshold is a single constant of 30 chapters. This feature pays for `sh-chapter-row`. [Detailed design](../../detailed-designs/books/view-book/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-chapter-row` component (logged, next, future variants; relative dates; status slot) | 2 |
| `BookPage` with header action, chapter list, trophy card and `loading`, `error`, `finished`, `edge` states (collapsed future rows) | 3 |
| `ShelfApi.book(id)` and `BookResponse` types | 1 |
| `GET /api/books/:id`: router, service (404 outside household, chapter composition, first line, review status, reward), repo | 3 |
| Playwright acceptance tests via `BookPage` page object (states and first line, action visible at 360 px, finished book with and without reward) | 2 |
| **Total** | **11** |

## Minimal scope

The chapter list with logged, next and future states, the first line of answer 1 and the header action, without the trophy card and without the collapsed `edge` state (all rows always listed). This still satisfies `L2-008` criteria 1 to 3 and defers criterion 4. Total: 9 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the collapsed "Chapters 11 to 80" disclosure; list every row | Long books scroll further; no requirement lost | 1 |
| Show the review status as text only, without the sticker | The sticker on reviewed rows from the mocks | 1 |

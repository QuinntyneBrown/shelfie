# Estimate — Review a chapter

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `ApiClient`, `grownUpGuard`, `requireRole`, `validate` and `problemDetailsHandler` are assumed present from the `platform` subsystem. `GET /api/chapter-logs/:id` and `POST /api/chapter-logs/:id/seen` are assumed delivered by reading-log/view-chapter-answers with the fields the design lists; `sh-banner`, `sh-textarea`, `sh-button`, `sh-cover` and `sh-error-state` are assumed paid for by the `shell` and `books` subsystems; `ShelfPage` and `GET /api/shelf` exist from books/view-shelf and are extended here. The review-chapter route path marked `<TO SUPPLY>` is assumed to be `/review/chapters/:id`. [Detailed design](../../detailed-designs/review/review-chapter/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-sticker-picker` component (reused from books/add-book, which pays for it; feedback stickers are a second item list) | 0 |
| `ReviewChapterPage` with `default`, `loading`, `error`, `invalid`, `submitting`, `success` (next chapter) and `reviewed` states; sticky feedback card from 1024 px | 4 |
| `ReviewApi.chapterLog` and `sendFeedback`; `queueCount` update from the result | 1 |
| `POST /api/chapter-logs/:id/feedback`: schema, router, service (404, 409, guarded update, next item and count), repo | 3 |
| `GET /api/shelf` `unseenFeedback` query and `ShelfPage` `sh-banner` per item with Dismiss and link to the chapter | 2 |
| Playwright acceptance tests via `ReviewChapterPage`, `ShelfPage` and `ChapterPage` page objects (send, no sticker, 300-char limit, reviewed read-only, 409, banner appears and clears) | 3 |
| **Total** | **13** |

## Minimal scope

The review-chapter page with answers, sticker picker, note and Send, the missing-sticker error and the reviewed read-only state, without the success screen's next-chapter button (Send returns to Review) and without the reader's shelf banner. This satisfies `L2-015` criteria 1 to 4 and defers `L2-016` entirely (the reader still sees feedback on the chapter page through reading-log/view-chapter-answers). Total: 10 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the "Review Chapter N" next-chapter button on the success state; always return to Review | One extra tap per chapter in a long queue; `next` leaves the response | 1 |
| Drop the reader banner (`L2-016` criterion 1 and 2) | Reader only discovers feedback by opening the chapter | 2 |
| Drop the Dismiss control on the banner | Reader cannot hide the banner without opening the chapter | 1 |
| Drop the "Nia saw it" time on the reviewed state | Grown-up cannot tell whether the reader has seen the feedback | 1 |

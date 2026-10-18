# Estimate — Upload a book cover picture

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, the migration, node:test API tests, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design system pages and this design. `ApiClient.put`, `ToastService`, `sh-banner`, `requireSession`, `requireRole`, `csrfGuard` and the profile-photo processing are assumed present and reused at 0 hours. [Detailed design](../../detailed-designs/books/upload-book-cover/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `003-book-cover.sql`; `processImage` shared with photos; `covers.service.ts` (320 × 480, save, remove, household-scoped read) | 3 |
| `covers.router.ts`: `PUT` (raw body, 5 MB, 413, any session), `DELETE` (parent), `GET` with `ETag`/304 and the sandboxing headers | 3 |
| `coverImage` on every book the books, shelf, chapters and review services return | 2 |
| `sh-cover` image with fallback; `coverImage` on `sh-book-card` and `sh-reward-card`; every cover in the app passes it | 3 |
| `sh-cover-picker` (hidden file input in a label button, type and size checks, busy, error) | 2 |
| Add a book: picker, object-URL preview, upload after the book, warning toast | 2 |
| Manage a book: picker in the header, upload on choose, remove, banner with Try again, toast | 2 |
| API tests (processing, isolation, roles, headers, deletion) and Playwright acceptance tests (add, change, remove, refusals, failure, covers everywhere) | 7 |
| **Total** | **24** |

## Minimal scope

Manage a book only: the parent adds, changes and removes the picture there, and it shows on the shelf and the book page. Add a book keeps colour and sticker only, other pages keep the colour and sticker, and the browser-side checks are left to the server. This satisfies `L2-046` criteria 5–9, `L2-047` for the shelf and the book page, and `L2-048`. Total: 15 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| No picture on Add a book | The picture is added afterwards on Manage a book, by a parent | 2 |
| Pictures on the shelf and book page only | Review, Books, Log a chapter and the other covers show colour and sticker | 2 |
| Drop the browser-side type and size checks | A 20 MB picture is sent before it is refused | 1 |

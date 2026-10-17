# Estimate — Manage and remove a book

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient`, `ToastService` and `grownUpGuard`, the `platform/` middleware (`validate`, `requireRole`, `problemDetailsHandler`), `sh-text-field` (sign-in), `sh-cover`, `sh-progress`, `sh-skeleton`, `sh-empty-state` and `sh-error-state` (view-shelf) and `GET /api/books/:id` (view-book) are assumed present. The Questions section is estimated in manage-questions and the rewarded header in review/give-reward. Cover editing follows the mock and is not included. The removal toast copy and clearing `finished_at` when the count rises add no work. This feature pays for `sh-dialog`. [Detailed design](../../detailed-designs/books/manage-book/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-dialog` component (reused from shell/navigate-shell, which pays for it) | 0 |
| `BooksPage` with status derivation, summary line and `loading`, `empty`, `error` states | 2 |
| `ManageBookPage` header, chapters-logged table, Details form with chapter floor and `invalid`, `submitting`, `success`, `error` states | 3 |
| `DeleteBookDialog` with `busy` and `failed` states, close and navigation | 2 |
| `BooksApi` (`list`, `get`, `update`, `remove`) and `GET /api/books` router, service, repo | 2 |
| `PATCH /api/books/:id`: `updateBookSchema`, chapter-count floor (400), update | 2 |
| `DELETE /api/books/:id`: cascading delete in one transaction | 1 |
| Playwright acceptance tests via `BooksPage`, `ManageBookPage` and `DeleteBookDialog` page objects (edit appears on shelf, remove with toast, cancel and Escape return focus, failed delete keeps book, empty list, chapter floor) | 2 |
| **Total** | **14** |

## Minimal scope

The Books list with its empty state, the Details form with the chapter-count floor, and removal through a native `confirm()` instead of `DeleteBookDialog` and `sh-dialog`. This still satisfies `L2-010` criteria 1, 2, 5 and 6 and defers criteria 3 and 4 (focus return and the in-dialog failure state). Total: 11 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the "Chapters logged" table from the manage page | The grown-up's overview of logged chapters; the review queue still lists pending ones | 1 |
| Drop the status badges and summary line on the Books list | At-a-glance status; rows still show progress | 1 |
| Reuse the browser `confirm()` instead of `DeleteBookDialog` on `sh-dialog` | Dialog copy, hint to give a reward instead, `failed` state, focus return | 4 |

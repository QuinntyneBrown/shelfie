# Estimate — Add a book

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient` and `ToastService` (shell/notify), the `platform/` middleware (`validate`, `requireRole`, `problemDetailsHandler`), `sh-text-field` and `sh-button` (sign-in) and `sh-cover` (view-shelf) are assumed present. The chapter count limit follows the mock (200). This feature pays for `sh-color-picker` and `sh-sticker-picker`. [Detailed design](../../detailed-designs/books/add-book/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-color-picker` component (7 labelled swatches, radio semantics, keyboard) | 2 |
| `sh-sticker-picker` component (12 labelled stickers in a grid, radio semantics, keyboard) | 2 |
| `AddBookPage` with live preview, client validation, summary alert and `invalid`, `submitting`, `error` states; route open to both roles | 4 |
| `ShelfApi.addBook` and success navigation with toast | 1 |
| `POST /api/books`: `createBookSchema` with `COVER_COLORS` and `STICKERS`, router, service, repo | 2 |
| Playwright acceptance tests via `AddBookPage` page object (valid add appears under Up next with toast, inline errors send nothing, 120-character limit, failure keeps values, reader session) | 2 |
| **Total** | **13** |

## Minimal scope

The form with title, author and chapter count, a plain radio list for colour and sticker instead of the two pickers, no live preview, and the endpoint with server validation. This still satisfies `L2-009` and defers only the mock's preview and picker visuals. Total: 9 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the live preview panel | Seeing the cover before saving | 1 |
| Replace `sh-sticker-picker` with a native `<select>` of sticker names | Emoji grid from the mocks; larger touch targets | 2 |
| Replace `sh-color-picker` with a native `<select>` of colour names | Swatches from the mocks | 1 |

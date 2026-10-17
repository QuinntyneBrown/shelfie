# Estimate — Manage questions

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient`, the `platform/` middleware (`validate`, `requireRole`, `problemDetailsHandler`), `sh-dialog` and `ManageBookPage` (manage-book) and `GET /api/books/:id` (view-book) are assumed present. The log form endpoint and the answer snapshot are assumed delivered by reading-log/log-chapter calling `questionsForBook`. The minimum question length is 5 characters and there is no placement column. This feature pays for `sh-textarea`. [Detailed design](../../detailed-designs/books/manage-questions/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-textarea` component (label, help, error slot, character limit) | 1 |
| Questions section of `ManageBookPage` (defaults without actions, custom with Edit and Remove) and `BooksApi` question methods | 1 |
| `EditQuestionDialog` in add and edit modes with `busy`, `invalid`, `failed` states | 2 |
| `questions` module: `DEFAULT_QUESTIONS`, `questionSchema`, router, service (`questionsForBook`, soft delete, 404 outside household), repo | 2 |
| Playwright acceptance tests via `ManageBookPage` and `EditQuestionDialog` page objects (add appears in next log form, inline errors, edit and remove leave earlier answers unchanged, failure keeps text) | 2 |
| **Total** | **8** |

## Minimal scope

`DEFAULT_QUESTIONS` with `questionsForBook`, the add dialog and `POST /api/books/:id/questions`, without edit and remove. This still satisfies `L2-013` criteria 1, 2, 3 and 5 and defers criterion 4. Total: 6 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop edit mode; keep add and remove (edit becomes remove then add) | Editing wording in place; `L2-013` criterion 4 still met through remove | 1 |
| Replace `sh-textarea` with a plain `<textarea>` and a native `maxlength` | Shared styling and error slot from the design system | 1 |

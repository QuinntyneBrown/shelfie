# Estimate — Log a chapter

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient`, `SessionService` and `ToastService`, the `sh-toast`, `sh-toast-stack`, `sh-button`, `sh-cover`, `sh-progress`, `sh-skeleton`, `sh-error-state` and `sh-top-bar` components, and the `platform/` middleware (`validate`, `csrfGuard`, `problemDetailsHandler`) are assumed present from the `platform`, `shell`, `sign-in` and `books` subsystems. The `book` and `question` tables and `questions.service.ts` are assumed present from the `books` subsystem. The draft autosave debounce is 3 seconds, the Undo toast lasts 10 seconds, and the API enforces that `n` is the next unlogged chapter. Offline queuing is estimated in shell/work-offline. [Detailed design](../../detailed-designs/reading-log/log-chapter/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-segmented` component (single-choice chips; Another day reveals a date input with `max` today) | 2 |
| `sh-textarea` component (reused from books/manage-questions, which pays for it) | 0 |
| `sh-question-field` component (numbered label, textarea, required marker, error slot) | 1 |
| `LogChapterPage` with `default`, `loading`, `error`, `invalid`, `submitting` and `success` states, Undo toast and `bookFinished` hand-off | 5 |
| `DraftStore` in `core` and autosave, restore and clear wiring in the page | 2 |
| `ChaptersApi` (`form`, `log`, `undo`) and typed results | 1 |
| `chapters` migration: `chapter_log` (UNIQUE book_id, chapter_number) and `answer` tables | 1 |
| `GET /api/books/:id/chapters/:n/form`: router, service (household check, range check, already-logged 409), repo | 2 |
| `POST /api/books/:id/chapters/:n`: schema, future-date check, transaction inserting log and snapshotted answers, 409 on duplicate, `undo_until`, result | 4 |
| `DELETE /api/chapter-logs/:id`: household check, `undo_until` check, delete log and answers | 2 |
| Playwright acceptance tests via `LogChapterPage` page object (happy path, blank question 1, optional blanks, counter, draft restore, undo, late undo, duplicate, future date) | 4 |
| **Total** | **24** |

## Minimal scope

The form with the three date chips, the question fields with the 2000-character limit and counter, the required first answer, the `POST` with duplicate and future-date rejection, and the success state. It leaves out drafts and Undo (no `DraftStore`, no `DELETE` endpoint, no `undo_until` check). This still satisfies `L2-011` criteria 1, 2, 3, 6, 7 and 8 and defers criteria 4 and 5. Total: 20 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop drafts (`DraftStore` and autosave) | A closed tab loses half-written answers (`L2-011` criterion 4) | 2 |
| Drop Undo (toast action, `DELETE` endpoint, `undo_until`) | No way back after "I'm done!" (`L2-011` criterion 5) | 3 |
| Use a plain `sh-textarea` per question instead of `sh-question-field` | Numbered label and error slot are hand-built in the page | 1 |
| Replace `sh-segmented` with three radio buttons styled by the page | Reusable chip group for later features | 1 |

# Estimate — Per-reader records

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, the migration, node:test API tests, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design system pages and this design. `sh-segmented`, `sh-avatar`, `requireSession`, `requireRole` and every existing page are reused at 0 hours. [Detailed design](../../detailed-designs/settings/per-reader-records/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `011-per-reader-records.sql`: `book.reader_id`, `first_reader()`, the two triggers, `streak_reward_earned` and the data move; migration tests | 6 |
| `readers.service.ts` `readerFor` / `onlyReader` / `householdReaders`; reader scope on shelf, books, chapters, covers, questions, certificates | 8 |
| Per-reader streak, badges and streak rewards (earn, give, already-given across readers) | 5 |
| Review overview per reader with `readers[].waiting`; notifications to the book's reader | 4 |
| `ReaderChoiceService`; pickers on Review, Books and Add a book; reader labels on Manage book and Review a chapter; shell badge | 8 |
| API tests (isolation between readers, migration, streak rewards) and Playwright acceptance tests (two readers end to end, one-reader regression) | 9 |
| **Total** | **40** |

## Minimal scope

Books per reader and per-reader shelf, streak and badges, with Review and Books showing every reader's items labelled by name instead of a picker. This satisfies `L2-137`, `L2-139`, `L2-140`, `L2-141`, `L2-144` and defers `L2-138`'s picker and `L2-143`. Total: 26 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Keep streak rewards earned per household | A sibling's streak earns the other's reward | 4 |
| Don't remember the picked reader | The parent picks again on each page | 2 |
| Keep notifications going to every reader | A sibling's phone shows the other's sticker | 1 |

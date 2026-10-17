# Estimate — Celebrate a finished book

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `LogChapterPage`, `ChaptersApi`, the `chapters` module and its transaction are assumed present from log-chapter; `BookPage`, `GET /api/books/:id` and `sh-reward-card` are assumed present from the `books` subsystem; the review queue's "give a reward" row is estimated in the `review` subsystem. [Detailed design](../../detailed-designs/reading-log/celebrate-finished-book/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-celebration` component (confetti layer that runs 2.5 s and stops, two variants, static state under `prefers-reduced-motion`) | 2 |
| `LogChapterPage` `finished` state with live-region heading and the two next moves | 1 |
| `BookPage` finished hero (progress "N of N · finished!", trophy, reward or "Dad is picking your reward") | 1 |
| `chapters.service.ts`: count logs after insert, set `finished_at`, return `bookFinished`; clear `finished_at` on undo | 1 |
| Playwright acceptance tests via `LogChapterPage` and `BookPage` page objects (last chapter celebrates, reduced motion renders static, book page finished hero) | 1 |
| **Total** | **6** |

## Minimal scope

Set `finished_at` and return `bookFinished`, and render the finished state in `LogChapterPage` with the static trophy and heading, without `sh-celebration` and without the book page hero. This still satisfies `L2-019` criterion 2 and the "celebration is displayed" part of criterion 1 in its static form. Total: 3 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the confetti animation; keep a static trophy card in both motion settings | The animated moment for readers who allow motion | 2 |
| Drop the `BookPage` finished hero; show the ordinary header with "N of N" | The "You finished <title> on <day>!" line on the book page | 1 |

# Estimate — View the shelf

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient` and `SessionService`, the `platform/` middleware (`requireRole`, `problemDetailsHandler`) and the `sh-top-bar` with its streak badge (shell/navigate-shell) are assumed present. The streak function in `chapters.service.ts` is assumed delivered by reading-log/track-streak; the feedback banner by review/review-chapter; `book.finished_at` is assumed set by reading-log/log-chapter. This feature pays for `sh-cover`, `sh-book-card`, `sh-progress`, `sh-reward-card`, `sh-skeleton`, `sh-empty-state` and `sh-error-state`; later features reuse them at no cost. [Detailed design](../../detailed-designs/books/view-shelf/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-cover` component (7 colours, sticker, 3 sizes) | 1 |
| `sh-book-card` component (cover, title, author or added line, progress, action slot) | 2 |
| `sh-progress` component (progressbar, label, no overflow at 80 chapters) | 1 |
| `sh-reward-card` component (trophy row with reward or "picking your reward") | 1 |
| `sh-skeleton` and `sh-empty-state` components (`sh-error-state` reused from sign-in/authorize-access) | 1 |
| `ShelfPage` with hero, summary line, responsive grids, trophy shelf and `loading`, `empty`, `error`, `long` states; `ShelfApi.shelf()` | 4 |
| `GET /api/shelf`: router, service (grouping, hero, rewards, unseen feedback, streak call), repo | 3 |
| Playwright acceptance tests via `ShelfPage` page object (groups and progress, empty, loading and error, grid columns at 360/768/1280, 80-chapter card) | 2 |
| **Total** | **15** |

## Minimal scope

The three groups of `sh-book-card` with cover and progress, the empty state and the error state with retry, without the hero and without the trophy shelf rows (finished books shown as plain cards). This still satisfies `L2-007` and defers `L2-018`. Total: 12 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the hero card; the first reading card carries the primary action | The "keep reading" emphasis from the mocks | 1 |
| Drop `sh-reward-card`; list rewards as text under finished cards | Trophy-shelf look from the mocks; `L2-018` still met | 1 |
| Drop `sh-skeleton`; show a text "Loading" line | Skeleton placeholders required by `L2-007` criterion 3 | 1 |

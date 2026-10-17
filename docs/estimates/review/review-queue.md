# Estimate — Review queue

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient`, `grownUpGuard` and `SessionService`, and the `platform/` middleware (`requireRole`, `problemDetailsHandler`) are assumed present from the `platform` subsystem. `sh-cover`, `sh-button`, `sh-skeleton`, `sh-empty-state` and `sh-error-state` are assumed paid for by the `books` subsystem's shelf features; `sh-top-bar` and `sh-tab-bar` by `shell`. The streak function is assumed exported by the `chapters` module (reading-log/track-streak). The `<TO SUPPLY>` items are assumed as: this-week window of 7 days ending today, activity cap of 20 items, "back from a week away?" shown from 10 queued chapters. [Detailed design](../../detailed-designs/review/review-queue/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-activity-item` component (emoji by kind, text, timestamp) | 1 |
| `ReviewPage` with `default`, `loading`, `empty`, `error` and `long` states, relative-day text, primary button on the newest row | 3 |
| `ReviewApi.load()` and `queueCount` signal; `AppComponent` passes the count to the bars | 1 |
| `GET /api/review`: router with `requireRole`, service (overview, daysToFinish, this-week stats, streak call), repo (four queries incl. activity `UNION ALL`) | 4 |
| Playwright acceptance tests via `ReviewPage` page object (queue order and content, empty state, error retry, long queue at XS, badge count) | 3 |
| **Total** | **12** |

## Minimal scope

The queue card alone: pending chapters newest first with the Review link, the empty state and the error state, with the badge count. This leaves out the finished-book cards, the this-week panel and the activity feed. It still satisfies `L2-014` criteria 1, 2 and 3 (criterion 4 is delivered by shell/navigate-shell) and defers nothing in `L2-014`; the finished-book card moves to give-reward's cost. Total: 7 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the activity feed and `sh-activity-item`; keep the Chapters and Streak tiles | Recent-events list on the Review page | 2 |
| Drop the this-week panel entirely | Weekly chapter count and the grown-up's view of the streak on this page | 1 |
| Drop relative-day text ("today", "yesterday"); always show the short date | Friendlier timestamps from the mock | 1 |

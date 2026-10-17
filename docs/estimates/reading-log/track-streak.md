# Estimate — Track the reading streak

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, unit tests of the pure function, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `GET /api/shelf`, `ShelfPage` and `sh-top-bar` are assumed present from the `books` and `shell` subsystems; `GET /api/review` and `ReviewPage` from the `review` subsystem; the `chapter_log` table and `chapters.repo.ts` from log-chapter; `household.time_zone` from the `platform` subsystem. [Detailed design](../../detailed-designs/reading-log/track-streak/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `streak.service.ts`: `computeStreak`, `todayIn` (Intl time zone), `streakFor`, the `distinctReadOnDays` repo query, with unit tests for the five criteria and the day boundary | 3 |
| `streak` in the `GET /api/shelf` response and `thisWeek.streak` in `GET /api/review` | 1 |
| `sh-streak-badge` component (flame, "N days", accessible label, zero state) | 1 |
| Shelf hero line and top-bar badge wiring; Review "Streak" tile | 1 |
| Playwright acceptance tests via `ShelfPage` and `ReviewPage` page objects (5-day streak, kept from yesterday, zero, shown to both users) | 1 |
| **Total** | **7** |

## Minimal scope

`computeStreak` with its unit tests, the shelf response field and the top-bar badge, without the Review tile and with today resolved in UTC rather than the household time zone. This still satisfies `L2-020` criteria 1, 2 and 3 and the reader half of criterion 5, and defers criterion 4 and the grown-up half of criterion 5. Total: 5 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the Review "Streak" tile and `thisWeek.streak` | The grown-up does not see the streak (`L2-020` criterion 5, grown-up half) | 1 |
| Resolve today in UTC instead of `household.time_zone` | Late-evening chapters may count for the wrong day (`L2-020` criterion 4) | 1 |

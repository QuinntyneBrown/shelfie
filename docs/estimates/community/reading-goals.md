# Estimate — Reading goals

## Basis

As for `manage-communities`. `sh-progress` and `sh-celebration` are reused at 0 hours. [Detailed design](../../detailed-designs/community/reading-goals/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `013-reading-goals.sql`; `goals.service.ts` (validation, counting in each household's time zone, states, set, remove) | 6 |
| `goals.router.ts`; community goal routes for the managing household | 3 |
| `sh-goal-card` | 3 |
| `ReadingGoalDialog`, `RemoveReadingGoalDialog`, goal cards on Community and a community | 6 |
| Shelf Reading goals section, celebration and once-per-goal toast | 3 |
| API tests (counting window, time zones, states, authorisation) and Playwright acceptance tests | 7 |
| **Total** | **28** |

## Minimal scope

Household goals only, no Edit (remove and set again), no reached toast. Satisfies `L2-154`, `L2-155`, `L2-157`, `L2-158`; defers community goals (`L2-159` to `L2-161`). Total: 16 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| No reached toast | Only the card celebrates | 1 |
| Community goals per household time zone → the managing household's time zone | A book finished near midnight elsewhere may count on the wrong day | 1 |

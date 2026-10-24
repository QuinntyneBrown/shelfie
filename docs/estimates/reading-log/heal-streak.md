# Estimate — Heal the streak

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, unit and API tests, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `streak.ts`, the streak rewards pattern (`streak-rewards.router.ts`, `StreakRewardDialog`), `GET /api/review`, `ReviewPage`, `SettingsPage`, `ShelfPage` and `sh-week-strip` are assumed present. [Detailed design](../../detailed-designs/reading-log/heal-streak/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Migration `014-streak-healing.sql` (`household.healing_activity`, `streak_heal` with the week key); `streak.ts` joins heals to `streakFor` and `weekFor`, with unit tests; badges stay on chapter logs | 3 |
| `streak-healing.service.ts` and `.router.ts`: activity get, set and clear; `healableDays`, `healOffer`, `healDay` with 400 `not-healable` and 409 `already-healed-this-week`; API tests for the rules, roles, isolation and logs | 5 |
| Settings "Streak healing" card, `HealingActivityDialog`, `StreakHealingApi`, toasts; Playwright through `SettingsPage` and a dialog page object | 4 |
| `heal` in `GET /api/review`, the Review heal card and toasts; Playwright through `ReviewPage` | 3 |
| `sh-week-strip` healed day (class, note line, accessible name) and the shelf; success card without heals; Playwright through `ShelfPage` | 3 |
| Erasure test; docs alignment | 2 |
| **Total** | **20** |

## Minimal scope

The migration, `streak.ts`, the API and the Review card, with the activity set through the API only and the healed day drawn as an ordinary read day. This satisfies `L2-161`, `L2-163` and `L2-164` and defers `L2-160`'s Settings UI and `L2-162`'s marked day. Total: 12 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| No Settings card; set the activity through the API | The parent cannot name the activity in the app (`L2-160`) | 4 |
| Draw a healed day as a plain read day | The reader cannot tell a healed day from a read one (`L2-162` criteria 1 and 2) | 2 |

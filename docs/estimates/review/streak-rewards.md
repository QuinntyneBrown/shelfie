# Estimate — Streak rewards

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests with `node:test`, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design-system page and this design. `ApiClient`, `ToastService`, `requireSession`, `requireRole`, `validationProblem`, the migration runner, `streak.ts`, `sh-dialog`, `sh-text-field`, `sh-reward-card`, `sh-celebration`, the Settings, shelf and Review pages are assumed present. [Detailed design](../../detailed-designs/review/streak-rewards/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `006-streak-reward.sql`; `streak-rewards.service.ts` and `.router.ts`: earn on read, set, clear, give, with schema, role and household checks | 5 |
| `streakRewards` in the shelf and review responses | 1 |
| API tests: validation, 401/403/404/409/400, isolation, earning (reach, already above, break, set later), no names in the log, erasure | 5 |
| `sh-reward-card` `unit` input | 1 |
| Settings: Streak rewards card, `StreakRewardDialog` (default, edit, invalid, busy, failed), remove, toasts, `StreakRewardsApi` | 5 |
| Shelf: Streak rewards section with progress, ready, given and celebration | 3 |
| Review: streak-reward card, Give it, summary count | 2 |
| Playwright acceptance tests via the Settings, dialog, Shelf and Review page objects | 5 |
| `008-streak-reward-amount.sql`, `amount` in the schema, service and API tests (`L2-112`) | 2 |
| Amount field in `StreakRewardDialog` and the Settings row (`L2-112`) | 2 |
| `sh-streak-reward-badge` and `sh-streak-reward-card` with the path of days; shelf and celebration use them (`L2-113`) | 4 |
| Playwright acceptance tests for the amount and the badges | 2 |
| **Total** | **37** |

## Minimal scope

The API with set, earn and give; the Settings card and dialog without the remove button; the shelf section without the celebration; Review with the Give it button. It satisfies `L2-100` criteria 1 to 3 and 5 to 7, `L2-101`, `L2-102` criteria 1 to 3 and 5, `L2-103` and `L2-104`, and defers the remove button, the celebration and the phone checks. Total: 19 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the remove button | A reward can be edited but not cleared | 1 |
| Drop the celebration | The moment of delight; "Ready!" still shows | 1 |
| Drop the progress bar | No sense of how close the next milestone is | 2 |
| Drop the path of days | The 7-day goal shows the bar like 30 and 100 | 1 |
| Drop the Review summary count | The parent sees the card but the headline does not count it | 1 |

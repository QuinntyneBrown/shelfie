# Estimate — Read together

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests with `node:test`, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design-system pages and this design. `ApiClient`, `ToastService`, `requireSession`, `requireRole`, `validationProblem`, the migration runner, the `Notifier`, `sh-dialog`, `sh-text-field`, `sh-segmented`, `sh-avatar`, `sh-progress`, `sh-celebration`, `sh-activity-item`, and the shelf, Settings and Review pages are assumed present. [Detailed design](../../detailed-designs/reading-log/read-together/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `011-read-together.sql`; `together.service.ts` and `.router.ts`: partners, log with the limits, list from the viewer's side, confirm, remove | 6 |
| `helper-reward.service.ts` and `.router.ts`: minutes on read, earn, set, give and reset | 4 |
| Sessions and the helper reward in the Review response | 2 |
| Two notifier moments under the existing choices | 1 |
| API tests: validation, limits, credit rules, confirm, remove, earn and give, roles, isolation, push | 6 |
| `sh-reader-picker`; trailing action on `sh-activity-item` | 2 |
| Read together page (`log-chapter`): questions, checks, celebration, failure states | 5 |
| Shelf: Read together button and Together card with progress, celebration and That’s right | 4 |
| Settings: Helper reward section and `HelperRewardDialog` | 3 |
| Review: helper-reward card, Give it, session lines with Remove | 3 |
| Playwright acceptance tests via page objects | 8 |
| **Total** | **44** |

## Minimal scope

Logging from either side, the shelf card without the celebration, the helper reward set in Settings and given from Review. It satisfies `L2-137` criteria 1 to 6, `L2-138`, `L2-140` criteria 1 and 3, `L2-141` criteria 1 to 3, `L2-142` criteria 1, 3 and 4, `L2-145` and `L2-146`, and defers confirmation, removal, the daily limit, the celebration and notifications. Total: 28 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop That’s right | The partner sees a session but cannot say it is right | 3 |
| Drop Remove on Review | A mistaken session stays in the helper minutes | 3 |
| Drop the notifications | Parents and readers learn of sessions and the reward in the app only | 2 |
| Drop the celebration | The reached moment shows only as a full bar | 1 |

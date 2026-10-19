# Estimate — Run challenges

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests with `node:test`, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design-system pages and this design. `ApiClient`, `ToastService`, `requireSession`, `requireRole`, `validationProblem`, the migration runner, `streak.ts`, the push `Notifier`, `sh-dialog`, `sh-text-field`, `sh-segmented`, `sh-switch`, `sh-avatar`, `sh-progress`, `sh-celebration`, `GiveRewardDialog`, and the Review, shelf and Settings pages are assumed present. [Detailed design](../../detailed-designs/review/run-challenges/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `011-challenges.sql`: `chapter_log.reader_id` with the one-reader backfill, `challenge`, `challenge_reader`, the one-open index, two household switches | 2 |
| `reader_id` stored on each log | 1 |
| `challenges.service.ts` and `.router.ts`: create, read with counting and ranking in the household time zone, end, reward, remove, close on read | 8 |
| Insights: top reader, biggest climber, longest streak per reader | 3 |
| Lead and end notifications, settings switches in the API | 3 |
| API tests: validation, one at a time, counting window and time zone, books, ties, winners, insights, end, reward, 401/403/404/409, isolation, notifications | 8 |
| `sh-leaderboard` | 2 |
| Review: tab switch, `ChallengesTab` (card, past list, empty, loading, error, End now, Remove) | 6 |
| `StartChallengeDialog` with validation, busy, failed and 409 | 4 |
| `GiveRewardDialog` for a challenge | 2 |
| Shelf: Challenge card, single reader, celebration, encouraging lines | 3 |
| Settings: two switches | 1 |
| Playwright acceptance tests via the Review, dialog, Shelf and Settings page objects | 7 |
| **Total** | **50** |

## Minimal scope

Create, read and end a chapters challenge with the leaderboard on Review and the shelf, without insights, books, past list, notifications or the reward hand-off. It satisfies `L2-137`, `L2-138`, `L2-139` criteria 1 and 3 to 6, `L2-140`, `L2-142` criteria 1 to 4 and 7, `L2-144` criteria 1 to 3, 6 and 7, and `L2-146`; it defers `L2-141`, `L2-143`, `L2-145` and the reward. Total: 30 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop insights | Dad sees only the board | 4 |
| Drop the two notifications | Dad finds out by opening Review | 5 |
| Drop the reward hand-off | The winner is shown but rewarded outside Shelfie | 3 |
| Drop the books measure | Chapters only | 2 |
| Drop the past list | Only the newest challenge is visible | 2 |

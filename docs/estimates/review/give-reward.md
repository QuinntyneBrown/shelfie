# Estimate — Give a reward

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. `ApiClient`, `ToastService`, `grownUpGuard`, `requireRole`, `validate`, `problemDetailsHandler` and the migration runner are assumed present from the `platform` subsystem. `sh-dialog`, `sh-text-field`, `sh-textarea`, `sh-button`, `sh-cover` and `sh-reward-card` are assumed paid for by the `books` and `shell` subsystems, as are the shelf and book pages that render the reward; `ReviewPage` and its finished-book card come from review-queue. The note limit is 300 characters, reward cards show a fixed trophy icon, and the success toast reads "Reward given!". [Detailed design](../../detailed-designs/review/give-reward/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `GiveRewardDialog` on `sh-dialog`: quick-pick chips, reward field with autofocus and `maxlength` 100, note, `default`, `invalid`, `busy`, `failed` states, Escape and focus return | 3 |
| `ReviewApi.giveReward` and `ReviewPage` handling of `given` (remove card, heading count, success toast) | 1 |
| `reward` table migration; `POST /api/books/:id/reward`: schema, router, service (404, 400 not finished, 409 exists, constraint mapping), repo | 3 |
| `reward` left join in `GET /api/books/:id` and `GET /api/shelf`; `ManageBookPage` `rewarded` state | 2 |
| Playwright acceptance tests via `GiveRewardDialog` and `ReviewPage` page objects (quick picks, empty text, 100-char limit, success shows on book and shelf, failure keeps text, second reward refused) | 3 |
| **Total** | **12** |

## Minimal scope

The dialog with the free-text field only, the empty-text error, the busy and failed states, and the endpoint with its 404, 400 and 409 rules, plus the reward on the shelf and book responses. This leaves out the quick picks, the optional note and the Manage book `rewarded` state. It satisfies `L2-017` criteria 2 to 5 and defers the quick-pick half of criterion 1. Total: 8 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the four quick-pick chips | One-tap rewards; the grown-up types every reward | 1 |
| Drop the optional note field and `reward.note` | A personal message beside the reward | 1 |
| Drop the Manage book `rewarded` state | Grown-up sees the reward only on the Review activity feed, not on Manage book | 1 |

# Estimate — Reward gallery

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests with `node:test`, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design-system page and this design. `ApiClient`, `ToastService`, `requireSession`, `requireRole`, `validationProblem`, the migration runner, `sh-dialog`, `sh-text-field`, `sh-progress`, `sh-celebration`, `sh-empty-state`, the Settings page, the shelf page and the Give a reward dialog are assumed present. [Detailed design](../../detailed-designs/review/reward-gallery/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `005-reward-gallery.sql`; `gallery.router.ts` and `gallery.service.ts`: list, add, edit, remove with schema, role and household checks | 4 |
| `pickGoal` transaction and `goalOf` (count since the pick, goal book, completion by its reward); `goal` in the review overview | 3 |
| API tests: validation, 401/403/404, isolation, progress counting, completion, no names in the log | 3 |
| `sh-reward-card` gallery mode (target, progress, badge, actions slot) and its styles | 2 |
| Settings: Rewards card, `GalleryRewardDialog` (default, edit, invalid, busy, failed), remove confirmation, toasts, `GalleryRewardsApi` | 5 |
| Shelf: "Reading toward" section with empty, failed, picker, goal and reached states; `ShelfApi.gallery` and `pickGoal` | 3 |
| Review: goal line on the goal book's card; `GiveRewardDialog` `suggested` input | 1 |
| Playwright acceptance tests via the Settings, gallery dialog, Shelf, Review and Give a reward page objects | 4 |
| Descriptions and pictures: `006-reward-pictures.sql`; description in the schema, service and `GalleryReward` | 1 |
| Picture routes and service: upload through `readImage` and `processImage`, remove, make featured, read with cache and sandbox headers; row lock, limit of 6 and featured fallback | 4 |
| API tests for pictures: processing, metadata, 400/401/403/404/409/413, one featured under any sequence, cascade, erasure, log | 3 |
| `sh-sticker` and `sh-picture-list` (components); `sh-reward-card` `picture` and `description`; the Settings row | 5 |
| `GalleryRewardDialog`: description field and rule; pictures uploaded at once when editing and after the reward when adding; busy, failed and Try again, wrong file, too many | 5 |
| Playwright acceptance tests for descriptions and pictures through the page objects | 4 |
| **Total** | **47** |

## Minimal scope

The API with the gallery, the pick and the derived goal; the Settings card and dialog without the remove confirmation (remove at once); the shelf section without the celebration (the goal card's "Ready!" badge alone); no Review goal line or prefill, so the parent types the reward as before. It satisfies `L2-081`, `L2-082`, `L2-084` to `L2-087` and criterion 3 of `L2-089`, and defers `L2-083` criterion 1, `L2-088` and `L2-089` criteria 1 and 2. Total: 18 hours.

Descriptions and pictures (`L2-096` to `L2-101`) can be dropped as a whole, saving 22 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the remove confirmation dialog | A safety net before a reward leaves her gallery | 1 |
| Drop the celebration on a reached goal | The moment of delight; "Ready!" still shows | 1 |
| Drop the Review goal line and the dialog prefill | The parent must notice the goal and type its name | 1 |
| Drop the separate gallery failure state on the shelf | A failed gallery hides the section silently | 1 |
| Pictures only when editing a saved reward (none on Add) | The parent saves first, then edits to add pictures | 2 |
| Drop Make featured (the first picture stays featured) | Choosing which picture stands for the reward | 2 |

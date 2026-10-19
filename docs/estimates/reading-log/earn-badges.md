# Estimate — Earn achievement badges

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests with `node:test`, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design-system page and this design. `streak.ts`, `shelf.service.ts`, `review.service.ts`, the shelf and review pages and their page objects are assumed present. [Detailed design](../../detailed-designs/reading-log/earn-badges/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `badges.ts`: `computeBadges` for the four badges and `badgesFor`; `badges` in the shelf and review responses | 3 |
| API tests: each badge's rule and its edge cases (one chapter a day, Sunday alone, six days, time zone), household isolation, 401 | 3 |
| `sh-achievement-badge` and its styles | 2 |
| Shelf "Badges" section and Review "Nia’s badges" card; `ShelfApi` and `ReviewApi` types | 2 |
| Playwright acceptance tests via the shelf and review page objects | 3 |
| **Total** | **13** |

## Minimal scope

The API with the four badges and the shelf section, without the Review card and without the earned dates. It satisfies `L2-096`, `L2-097` criteria 1, 3 and 4, and `L2-099`, and defers `L2-098`. Total: 9 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the Review card | The parent does not see the badges | 2 |
| Drop the earned day | Tiles say "Earned" with no date | 1 |
| Drop Week streak and Weekend reader | Two of the four feats | 2 |

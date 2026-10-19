# Estimate — Manage communities

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase, covering implementation, the migration, API tests, Playwright acceptance tests through page objects, and review fixes. `rateLimiter`, `sh-dialog`, `sh-text-field`, `sh-button`, `sh-banner`, `sh-empty-state` and `ToastService` are reused at 0 hours. [Detailed design](../../detailed-designs/community/manage-communities/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `012-communities.sql`; `communities.service.ts` (codes, start, join, list, get, leave, managing household) | 7 |
| `communities.router.ts` with zod, `joinLimiter`, Problems; runbook erasure line | 3 |
| `community` library: routes, `CommunitiesPage`, `CommunityPage`, three dialogs, `CommunitiesApi`, shell tab | 12 |
| `sh-join-code` | 2 |
| API tests (privacy keys, isolation, rate limit, leave, erasure) and Playwright acceptance tests with page objects | 8 |
| **Total** | **32** |

## Minimal scope

Start, join and list with the code copied by hand, no Leave dialog (a plain button), no rate limit. Satisfies `L2-145`, `L2-146`, `L2-148`, `L2-149`, `L2-153`; defers `L2-147` criterion 2 and `L2-150`. Total: 22 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| No Copy button | The parent selects the code by hand | 2 |
| No join rate limit | Codes can be guessed faster | 1 |

# Estimate — Authenticate admin calls

## Basis

Hours for an intermediate Node/Express and TypeScript developer who has not seen this codebase. The hours cover implementation, `node:test` API tests and review fixes; they exclude the requirements, the ADRs and this design. `openDb`, `requestLogging`, `Problem` and the `/api` security headers already exist and are reused. [Detailed design](../../detailed-designs/admin-api/authenticate-admin-calls/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `admin_token` and `admin_audit` tables in `migrations/004-admin.sql` | 1 |
| `admin-token.ts`: create, list, revoke, argument parsing and validation, `admin-token` npm script | 4 |
| `admin-auth.ts`: `requireAdminToken` with the four 401 types and `last_used_at`, `requireScope` | 3 |
| `admin-auth.ts`: `adminRateLimit` per source and minute with `Retry-After` | 2 |
| `admin-audit.ts`: row on response finish with route pattern, target id and dry-run flag | 2 |
| `admin.router.ts` skeleton, `refuse`, `GET /whoami`, mounting before `csrfGuard` in `app.ts` | 2 |
| `admin-api.yaml` security scheme, problem document and `whoami` | 1 |
| API tests: token script, each 401/403, session-versus-token isolation, rate limit, audit rows with no secrets | 5 |
| **Total** | **20** |

## Minimal scope

Tokens with a single all-powerful scope, `requireAdminToken`, the audit row and `whoami`. This satisfies `L2-049` (without scopes), `L2-050` criteria 1-3 and 5-7, `L2-052` and `L2-053`. It defers `L2-050` criterion 4 (scopes) and `L2-051` (rate limit). Total: 15 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop scopes; every token can write | No read-only token; least privilege rests on expiry alone | 2 |
| Drop the rate limit | A leaked token can call without throttling; `L2-051` is not met | 2 |
| Drop `admin-token list` | The operator reads `admin_token` with `psql` | 1 |

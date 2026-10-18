# Estimate — Serve admin data

## Basis

Hours for an intermediate Node/Express and TypeScript developer who has not seen this codebase. The hours cover implementation, `node:test` API tests and review fixes. `giveReward`, `hashSecret`, `streak.ts` and the zod validation helper are reused; authentication and audit come from `authenticate-admin-calls`. [Detailed design](../../detailed-designs/admin-api/serve-admin-data/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `transaction(db, dryRun, run)` and the `Problem` to problem-document mapping | 2 |
| Query endpoints: `GET /users`, `GET /books`, `GET /books/:id/logs`, `GET /logs/:id` | 4 |
| `PUT /users/:id/password` with session removal | 2 |
| `PATCH /logs/:id` with the household-day rule | 2 |
| `DELETE /logs/:id` with the newest-chapter and reward rules | 2 |
| `POST /books/:id/finish` and `POST /books/:id/reward` | 2 |
| `admin-api.yaml` paths and schemas | 2 |
| API tests for each endpoint, refusal and dry run | 6 |
| **Total** | **22** |

## Minimal scope

The four query endpoints and `PUT /users/:id/password`, the one change that has no workaround in the web app, without dry runs. This satisfies `L2-056` to `L2-059`. It defers `L2-060`, `L2-061` and `L2-062`. Total: 12 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `PATCH /logs/:id` | A wrong read-on day stays wrong; the streak cannot be repaired | 3 |
| Drop `POST /books/:id/finish` | A book can only finish by logging its last chapter | 2 |
| Drop dry runs | Previews and `--dry-run` are not possible; `L2-062` is not met | 3 |

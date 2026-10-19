# Estimate — Approve profiles

## Basis

Hours for an intermediate C#/.NET and Node.js developer, with `run-admin-commands` (`Print`, `WriteAsync`, the test harness) and `serve-admin-data` (guard, audit, dry-run transaction) in place. The hours cover three admin routes, three commands, API and CLI acceptance tests and review fixes. [Detailed design](../../detailed-designs/admin-cli/approve-profiles/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `listDirectoryProfiles` and `setProfileStatus` in `admin.service.ts`; three routes in `admin.router.ts` | 2 |
| `admin-api.yaml`: operations, schema and error types | 1 |
| API tests: scopes, dry run, `not-a-directory-profile`, `not-found`, audit row | 2 |
| `profiles list` in `QueryCommands`; `profiles approve` and `profiles hide` in `WriteCommands` | 2 |
| .NET acceptance tests against the local API: list, approve, hide, dry run, `--json`, a parent's id | 3 |
| **Total** | **10** |

## Minimal scope

`profiles list` and `profiles approve` without `--dry-run`. This satisfies `L2-145` criteria 1, 2, 4, 6 and 7. It defers hiding and dry run. Total: 7 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `profiles hide` | A listed profile can be removed only by erasure; `L2-145` criterion 3 is not met | 1 |
| Drop `--dry-run` | No preview; `L2-145` criterion 5 is not met | 1 |

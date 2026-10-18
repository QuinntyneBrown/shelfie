# Estimate — Run the production database

## Basis

Hours for an intermediate Node/Express and TypeScript developer who knows PostgreSQL and Azure Bicep but has not seen this codebase. The hours cover implementation, API tests with `node --test`, and review fixes. They exclude the requirements and this design. The Express application, the services and routers, the Playwright harness and the VM, storage account and deploy pipeline are assumed present from the sibling `operate-service` and `harden-api` features and the feature libraries; this estimate pays for moving them from SQLite to PostgreSQL and for what the move adds. Self-service deletion and export screens are deferred (AGENTS.md, Deferred work) and not costed. [Detailed design](../../detailed-designs/platform/run-production-database/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `db.ts`: `pg` pool from `DATABASE_URL` with TLS verified in production, `int8` parsing, `all`/`get`/`run`/`transaction` helpers | 2 |
| `migrate()` with advisory lock and `schema_migration`; `migrations/001-initial.sql` with cascades and indexes; `main.ts` migrating before `listen` and exiting on failure | 3 |
| Every service and router made asynchronous; `$n` placeholders, quoted aliases, `rowCount`, `23505` on unique violations; transactions for log-chapter, reset-password and settings | 8 |
| `test-db.ts` throwaway databases; API tests for migrations, health 503, start-up exit without the password, erasure cascade and purge | 4 |
| Playwright harness on a database per worker; asynchronous database helpers in the specs | 2 |
| `import-sqlite.ts` with its test and the one-off cutover note in the runbook | 2 |
| `purge.ts` nightly retention | 1 |
| `backup.sh` with `pg_dump` and upload; lifecycle rule; `postgresql-client` in cloud-init and `deploy.sh` | 2 |
| `main.bicep`: delegated subnet, private DNS zone, flexible server, database; `bootstrap.sh`: passwords, `shelfie_app` role, `DATABASE_URL` on the VM | 6 |
| `ci.yml` PostgreSQL service containers for the `api` and `e2e` jobs | 1 |
| `docs/runbook.md`: restore paths, erasure, maintenance, cost; README and CONTRIBUTING local set-up | 2 |
| Rehearsal against a real flexible server: bootstrap, import, restore of a dump, erasure | 4 |
| **Total** | **37** |

## Minimal scope

The pool, the migration runner with `001-initial.sql`, the asynchronous services and routers, the throwaway test databases, the Playwright harness and the CI service containers, plus the flexible server in Bicep with `DATABASE_URL` written by bootstrap. This still satisfies `L2-037`, `L2-038` criteria 1 to 4, and `L2-040` criteria 1 to 5. It defers the SQLite import (`L2-038` criterion 5), the nightly dump and lifecycle rule (`L2-039` criteria 2 to 4, leaving point-in-time restore alone), the purge (`L2-041` criterion 3) and the rehearsal. Total: 26 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `import-sqlite.ts`; re-create the one existing household by hand | The first release's chapter logs and answers are not carried over | 2 |
| Drop the nightly `pg_dump` and lifecycle rule; rely on point-in-time restore only | No off-server copy; recovery window shrinks from 30 days to 7 | 2 |
| Drop `purge.ts` | Expired sessions, spent tokens and old attempts accumulate | 1 |
| Drop the rehearsal against a real server | Bootstrap, import and restore are first exercised on production day | 4 |

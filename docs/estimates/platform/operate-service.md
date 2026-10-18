# Estimate — Operate the service

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, tests, and review fixes, and include the one-off workspace and pipeline setup that the mocks' budget table counts as "Platform setup". They exclude the requirements and this design. The security middleware is costed in the sibling `harden-api` feature; the `server-error` page that shows the request id is costed in the shell's `navigate-shell` feature, and `DraftStore` in `log-chapter`. The uptime monitor is deferred (AGENTS.md, Deferred work) and not costed; the dump retention is 30 days. The deployment rows cover the Azure VM, the deploy pipeline and the backup schedule. [Detailed design](../../detailed-designs/platform/operate-service/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Angular workspace `apps/web`: `shelfie` application, `core`, `components` and six feature libraries, lazy `loadChildren` routes, ESLint and Prettier, `angular.json` bundle budgets | 4 |
| `apps/api` scaffold: Express 5 and TypeScript build, `db.ts` pool and migration runner (moved to PostgreSQL in `run-production-database`), test harness with a throwaway database | 3 |
| `logger.ts`: `pino`, `requestContext` with `SHF-XXXX` id, `X-Request-Id`, one request line on finish; unhandled-error logging in `problemDetailsHandler`; `ApiClient` carries `problem.requestId` | 2 |
| `health.router.ts`: `GET /api/health` with 200 and 503 | 1 |
| `backup.sh` nightly dump and upload (moved to `pg_dump` in `run-production-database`); `docs/runbook.md` restore steps | 2 |
| Index migrations, `seed-perf.ts` (100 books of 80 chapters) and p95 read test | 2 |
| `e2e/` Playwright setup: Chromium-only config, web and API start-up, base page object and fixtures | 2 |
| `.github/workflows/ci.yml`: lint, unit, api, build, e2e and lighthouse jobs; `lighthouserc.json` with LCP and script-weight assertions | 4 |
| API tests: health 200 and 503, request line fields, 500 body carries request id and no stack, restart test for a committed chapter | 2 |
| `infra/main.bicep`: VM, network, static IP, storage account with `releases` and `backups` containers, managed identity role | 4 |
| `infra/cloud-init.yaml`: Node 24, Caddy, `shelfie` user, `/etc/shelfie/env`, swap, unattended upgrades | 3 |
| `infra/host/`: `deploy.sh` with health check and rollback, `fetch-release.sh`, `backup.sh` with blob upload, Caddyfile, systemd unit, cron | 4 |
| `.github/workflows/deploy.yml`: reuse CI, release tarball, OIDC sign-in, blob upload, run-command, health check | 3 |
| `infra/bootstrap.sh`: resource group, Bicep deploy, GitHub identity with federated credential, roles, GitHub environment | 1.5 |
| Branch ruleset on `main` | 0.5 |
| `docs/runbook.md` and design, estimate and AGENTS.md updates | 2 |
| **Total** | **40** |

## Minimal scope

The workspace, API scaffold, health endpoint, request logging with the request id, the cron-driven nightly dump with a short restore note, and a pipeline running lint, unit, API and Playwright jobs. This still satisfies `L2-031` and `L2-032` in full and `L2-030` criterion 3 through the `angular.json` budget alone. It defers the Lighthouse CI job (criteria 1 and 4 of `L2-030` are unchecked) and the perf seed and p95 test (criterion 2 is unchecked); the indexes remain. With the deployment rows it totals 35 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the Lighthouse CI job; keep the `angular.json` bundle budget | LCP and input-response budgets are not checked automatically | 2 |
| Drop `seed-perf.ts` and the p95 test; keep the indexes | Read latency with 100 books of 80 chapters is unmeasured | 1 |
| Drop integrity check and pruning from `BackupJob`; copy only | A corrupt copy is not detected; old copies accumulate | 1 |
| Drop the restart test; rely on WAL configuration | Durability of a committed chapter is unverified | 1 |

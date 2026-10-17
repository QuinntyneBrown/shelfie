# Estimate — Authorize access

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `sessionMiddleware`, `problemDetailsHandler` and the request id come from the `platform` subsystem; `sh-top-bar` comes from the `shell` subsystem. The household scope inside each module's repository is paid for by the feature that writes that repository; this estimate covers the convention, `requireRole()`, the guards, the three pages and the two-household acceptance fixture. [Detailed design](../../detailed-designs/sign-in/authorize-access/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `authGuard` and `grownUpGuard` in `core`; route wiring in `app.routes.ts` including `/forbidden`, `/error` and the `**` route | 1 |
| `requireRole()` in `platform/authz.ts` (401 `no-session` / `session-expired`, 403 `grown-ups-only`) applied to every router; `NotFoundError` mapping in `problemDetailsHandler` | 1 |
| `sh-error-state` component (icon, heading, body, actions slot) | 1 |
| `NotFoundPage`, `ForbiddenPage`, `ServerErrorPage` and `GlobalErrorHandler` with request id and Try again | 2 |
| Two-household Playwright fixture and acceptance tests via page objects (401 redirect, reader on grown-up URL, unknown URL, server failure page, foreign id answers 404) | 1 |
| **Total** | **6** |

## Minimal scope

The two guards, `requireRole()`, the household-scoped `404` and a single plain error page used for Not found and Grown-ups only, without `ServerErrorPage` and `GlobalErrorHandler`. This still satisfies `L2-005` criteria 1 to 3 and `L2-006` criteria 1 and 2, and defers `L2-005` criterion 4. Total: 4 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `GlobalErrorHandler`; pages show only their inline `error` state and the request id appears nowhere | A failure outside a page's own loader leaves a blank page; support cannot match a report to a log line | 1 |
| Drop `sh-error-state`; hand-write the three pages | Shared look between the error pages and every page's inline `error` state | 1 |

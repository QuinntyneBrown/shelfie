# Estimate — Manage a session

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `sessionMiddleware`, `csrfGuard` and `problemDetailsHandler` are assumed present from the `platform` subsystem and only extended here; `sh-top-bar` and `sh-banner` are assumed paid for by the `shell` subsystem; the route guards are counted in authorize-access. The session idle timeout is 30 days, from the sign-in mock. [Detailed design](../../detailed-designs/sign-in/manage-session/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sessionMiddleware` expiry handling, `GET /api/auth/session`, `POST /api/auth/sign-out`, `deleteExpiredSessions`, `Cache-Control: no-store` on `/api` | 2 |
| `SessionService.restore()` through `provideAppInitializer`; `ApiClient` 401 handling with `session-expired` and `no-session` navigation | 2 |
| `sh-menu` component (reused from shell/navigate-shell, which pays for it) | 0 |
| Account menu contents for reader and grown-up; Sign out and Switch reader wiring; `expired` state on `SignInPage` | 1 |
| Playwright acceptance tests via page objects (expired session message, sign-out then Back, switch reader to picker) | 1 |
| **Total** | **6** |

## Minimal scope

Session restore at start, server-side expiry with the `expired` message, and a single Sign out item that deletes the session. This still satisfies `L2-003` criteria 1, 2 and 3 and defers criterion 4 (Switch reader), which the reader can work around with Sign out. Total: 5 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `sh-menu`; render Sign out as a plain button in the top bar | Account menu from the mocks; Settings shortcut and Switch reader item | 1 |
| Drop the `expired` banner; return to the plain picker on expiry | The person is not told why they were signed out | 1 |

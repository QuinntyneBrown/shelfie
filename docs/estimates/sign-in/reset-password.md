# Estimate — Reset a forgotten password

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks and this design. `sh-text-field` and `sh-button` are assumed paid for by sign-in-with-password, and the `device` table, session creation and `platform/` middleware are assumed present. SMTP configuration comes from environment variables and the production mail provider is deferred (AGENTS.md, Deferred work); the acceptance tests are assumed to read the reset link from a local SMTP sink started by the test setup, which is counted here. [Detailed design](../../detailed-designs/sign-in/reset-password/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `ForgotPasswordPage` with `default`, `invalid`, `submitting`, `success` and `error` states; `AuthApi.forgotPassword` | 2 |
| `ResetPasswordPage` with `default`, `invalid`, `submitting`, `success` and `error` states; `AuthApi.resetPassword`; route | 2 |
| `POST /api/auth/forgot-password`: schema, `password_reset` migration, service (random token, SHA-256 hash, 1-hour expiry, identical response), repo | 2 |
| `nodemailer` SMTP transport, configuration and plain-text reset message | 1 |
| `POST /api/auth/reset-password`: schema, service (single use, argon2id, delete all sessions, new session and device cookie in one transaction), repo | 2 |
| Playwright acceptance tests via page objects and SMTP sink (same message both cases, happy path, used and expired link, inline errors, other sessions invalidated) | 1 |
| **Total** | **10** |

## Minimal scope

Both pages with their happy paths and inline validation, the two endpoints, and the mail transport, without the `error` states for an unreachable server and without the "send it again" link. This still satisfies `L2-004` criteria 1 to 5 and defers only the two resilience states, which no criterion names. Total: 8 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the SMTP sink in tests; read the token hash from the database and rebuild the link in the test setup | Delivery itself is not exercised by the acceptance tests | 1 |
| Drop the `error` states on both pages; show the generic invalid summary on any failure | The grown-up cannot tell an outage from a bad link or address | 1 |

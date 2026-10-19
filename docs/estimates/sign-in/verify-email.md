# Estimate — Verify a parent's e-mail

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests, Playwright acceptance tests through page objects (Chromium only) and review fixes. They exclude the requirements, mocks, design system and design already done. `ApiClient`, `SessionService`, `BannerService`, `ToastService`, `sh-auth-layout`, `sh-banner`, `sh-button`, `sh-skeleton`, the `rateLimiter` and the injectable `Mail` are present and reused. The ACS transport and the infrastructure are costed in `platform.md` (production mail provider). [Detailed design](../../detailed-designs/sign-in/verify-email/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `mail-template.ts` `renderMail` (HTML and text, escaping); reset and invite mails switched to it; API tests | 4 |
| Migration `012-verify-email.sql` (column, back-fill, table); seed and import mark parents verified; `emailVerified` on the session | 2 |
| `verify-email.service.ts`; sign-up sends unawaited and logs failures without secrets; `POST /api/auth/verify-email`; API tests | 4 |
| `POST /api/auth/verify-email/resend` with role check, limiter and newest-only; accept-invite sets verified; API tests | 3 |
| `VerifyEmailPage` (verifying, success, error with Send a new link or Sign in), route, `AuthApi.verifyEmail` | 4 |
| `BannerService` action, the shell banner wiring, `EmailVerificationService` and its toasts | 3 |
| Playwright: `VerifyEmailPage` and shell page objects, mailbox helpers, `verify-email.spec.ts` | 5 |
| **Total** | **25** |

## Minimal scope

The mail at sign-up, the verify endpoint and page, and the banner without Send it again. It satisfies `L2-144` to `L2-148` and `L2-150` to `L2-152`, and defers `L2-149`. It costs 19 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop Send it again and its limit | `L2-149` | 4 |
| Drop the branded template; keep plain text | `L2-151` | 3 |
| Drop the signed-in Send a new link on the error page; always offer Sign in | `L2-147` criterion 2 | 1 |

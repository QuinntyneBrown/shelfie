# Estimate — Sign in with a password

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient` and `SessionService`, and the `platform/` middleware (`validate`, `problemDetailsHandler`, `rateLimit.ts`, session cookie handling) are assumed present from the `platform` subsystem; the login rate limiter itself is counted in the harden-api design and only applied here. `sh-profile-card` is assumed paid for by sign-in-with-pin. The device cookie signing key marked `<TO SUPPLY>` is assumed to be one environment variable. [Detailed design](../../detailed-designs/sign-in/sign-in-with-password/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-text-field` component (label, help, error slot via `aria-describedby`, text/e-mail/password types) | 2 |
| `sh-button` component (primary and ghost variants, busy state with `aria-busy`) | 1 |
| `SignInPage` password step and no-cookie form with `password`, `invalid`, `submitting`, `error` states and client-side validation | 3 |
| `AuthApi.profiles`, `AuthApi.signInWithPassword` and `SessionService` wiring; navigate to Review | 1 |
| `GET /api/auth/profiles`: `device` table migration, HMAC-signed `shelfie_device` cookie, router, service, repo | 2 |
| `POST /api/auth/password`: schema, router with rate limiter applied, service (argon2id verify, generic failure, session, device creation), repo | 3 |
| Playwright acceptance tests via `SignInPage` page object (happy path, field errors, wrong credentials, busy button, unreachable server) | 1 |
| **Total** | **13** |

## Minimal scope

The password step for a device that already has the `shelfie_device` cookie seeded, with the happy path, the generic wrong-credentials error and client-side validation, but without the no-cookie e-mail form, the busy state and the unreachable-server state. This still satisfies `L2-002` criteria 1, 2 and 3 and defers criteria 4 and 5. Total: 9 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the no-cookie form; seed the device cookie by hand on each new browser | A new browser cannot sign in without manual setup | 1 |
| Drop the `error` state with Try again; show the generic invalid message on any failure | The grown-up cannot tell an outage from a typo | 1 |
| Use native `<input>` and `<button>` instead of `sh-text-field` and `sh-button` | Mock look, help text and busy spinner; later features pay for the components instead | 3 |

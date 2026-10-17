# Estimate — Sign in with a PIN

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient` and `SessionService`, and the `platform/` middleware (`validate`, `problemDetailsHandler`, session cookie handling) are assumed present from the `platform` subsystem; the `shelfie_device` cookie is assumed set by the sign-in-with-password feature. The endpoint rate limit marked `<TO SUPPLY>` in the design is assumed to be none beyond the per-profile lock. [Detailed design](../../detailed-designs/sign-in/sign-in-with-pin/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-profile-card` component (avatar, name, role; keyboard focus) | 1 |
| `sh-pin-keypad` component (4 masked slots, digits-only input, backspace, error slot, locked countdown) | 3 |
| `SignInPage` PIN step with `pin`, `pin-invalid`, `locked`, `submitting`, `error` states | 2 |
| `AuthApi.signInWithPin` and `SessionService` wiring | 1 |
| `POST /api/auth/pin`: schema, router, service (argon2id verify, failure count, 5-minute lock), repo | 3 |
| Playwright acceptance tests via `SignInPage` page object (happy path, wrong PIN, lock, locked-refuses-correct, digits only) | 2 |
| **Total** | **12** |

## Minimal scope

Profile picker and PIN keypad with correct-PIN sign-in and the wrong-PIN inline error, without the lockout. This still satisfies `L2-001` criteria 1, 2 and 5 and defers criteria 3 and 4 (the five-failure lock and its enforcement). Total: 9 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the remaining-time countdown; show a static "try again in 5 minutes" message | Reader cannot see when the lock lifts | 1 |
| Reuse a plain `sh-text-field` with `inputmode="numeric"` instead of `sh-pin-keypad` | Keypad look from the mocks; larger touch targets | 2 |

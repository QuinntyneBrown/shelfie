# Estimate — Sign in with Google or Facebook

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, API tests, Playwright acceptance tests through the `SignInPage` and `SignUpPage` page objects, and review fixes. They exclude the requirements, mocks and this design. `sh-button`, `sh-banner`, `AuthApi`, `createSession`, `setSessionCookie`, `rateLimiter` and the test stack (`createTestDatabase`, the Playwright worker server) are assumed present from the sign-in and platform subsystems. Creating the OAuth apps at Google and Meta is an operator step and not counted. [Detailed design](../../detailed-designs/sign-in/sign-in-with-google-or-facebook/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `GET /api/auth/providers`; `sh-provider-icon`; `secondary` variant of `sh-button`; the divider and buttons on `SignInPage` and `SignUpPage`, shown per configured provider | 2 |
| `oauth.ts`: provider table from the environment, `authorizeUrl` with `state` and S256 PKCE, `exchangeCode` with `fetch` for Google (ID token) and Facebook (`/me`), configurable endpoints | 3 |
| `GET /api/auth/:provider/start` and `/callback`: `shelfie_oauth` cookie, `state` check, redirects back with a reason, session cookie as password sign-in | 3 |
| `signInWithProvider`: link by subject, by verified parent e-mail, or start a household; refusals; `freeUsername`; migration `012-profile-provider.sql` | 3 |
| Return banners on both pages (`reason`, `provider` inputs); "Keep me signed in" through the round trip; `providerSignInLimiter` with the redirecting refusal | 2 |
| Stand-in provider (`oauth-fake.ts`) for the API tests and the Playwright stack; API tests for the flow, the links, the refusals, the limiter | 3 |
| Playwright acceptance tests via page objects (buttons per provider, existing parent, new household, link survives an e-mail change, each refusal, remember on and off, Facebook) | 3 |
| Runbook operator steps, changelog | 1 |
| **Total** | **20** |

## Minimal scope

Google only, signing in an existing parent by verified e-mail and starting a household for an unknown one, with the cancelled and failed banners, the `state` and PKCE checks and the limiter. This still satisfies `L2-144` criteria 1 to 5 for Google, `L2-146` and `L2-149`, and defers Facebook, the subject link (`L2-145` criteria 1 and 3) and the reader and no-e-mail banners. Total: 13 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop Facebook | One of the two ways in; the design's provider table still allows adding it later | 2 |
| Drop the `profile_provider` link and match by verified e-mail only | A parent who changes their e-mail at the provider loses access until Forgot password; no migration | 2 |
| Drop the Playwright stand-in and test the flow at the API level only | The buttons, the busy state, the banners and the cookie's `SameSite` crossing are not exercised in a browser | 3 |

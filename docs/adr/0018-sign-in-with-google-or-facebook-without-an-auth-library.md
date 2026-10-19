# ADR-0018: Parents sign in with Google or Facebook through a plain OAuth flow in the API, linked by subject then by verified e-mail

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-137, L2-138, L2-139, L2-140, L2-141, L2-142

## Context

Parents want to create a Shelfie account, or get into an existing one, without a username and password. Readers must keep signing in with a username and password under a parent's control (L1-001). The API already has server-side sessions, a session cookie that is HttpOnly, Secure and `SameSite=Strict`, a CSRF guard, rate limiting over the `sign_in_attempt` table and a `profile` table with a `NOT NULL` username and a nullable `password_hash`. Node 24 ships `fetch` and `crypto`. The tests, locally and in CI, must never call Google or Facebook.

## Decision

1. **Plain OAuth 2.0 authorization-code flow with PKCE, in the API, with `fetch` and `crypto`.** No Passport, no provider SDK. Google is used as an OpenID Connect provider (`openid email profile`; `email`, `email_verified`, `name` and `sub` read from the ID token); Facebook through the Graph API (`/me?fields=id,name,email`). The browser only follows redirects and never sees a provider token; the tokens are discarded once the identity is read.
2. **Linking order: provider subject first, then verified e-mail.** A `profile_provider` table holds `(provider, subject) → profile_id`. A known subject signs that parent in whatever e-mail the provider now reports. An unknown subject with a verified e-mail that is a parent's e-mail signs that parent in and adds the link. A verified e-mail that matches nothing starts a household, as sign-up does, and adds the link. A reader's e-mail, and a missing or unverified e-mail, are refused.
3. **Parents only.** The flow never signs a reader in and never creates one.
4. **`state` and the PKCE verifier travel in a 10-minute HttpOnly, Secure, `SameSite=Lax` cookie** scoped to `/api/auth`, together with the "Keep me signed in" choice and the page to return to. Lax, because the provider's redirect back is a cross-site navigation; the session cookie itself stays Strict.
5. **Google's ID token is decoded, not signature-checked.** It is received directly from Google's token endpoint over TLS in exchange for the code, the client secret and the verifier, the case in which OpenID Connect Core (3.1.3.7, note 6) allows the client to skip signature validation; `aud` is still compared with the client id.
6. **A provider-created parent gets a generated username and no password.** The username comes from the e-mail's local part, made unique with a number; `profile.username` stays `NOT NULL`. The parent never types it; with no password it opens nothing until Forgot password sets one.
7. **A provider's endpoints are configurable**, so the API tests and the Playwright stack run an in-process stand-in that answers a chosen name, e-mail and verified flag, cancels or fails. Client ids and secrets come from `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`; a provider with either missing is off and its button hidden.

## Consequences

- No new dependency; the whole flow is one router, one `oauth.ts` module, one service function and one migration.
- A parent who changes their e-mail at Google still signs in; a parent who first signed up with a password gets in with Google by e-mail and is linked from then on.
- An unverified e-mail is refused rather than trusted, so nobody can claim a parent account by registering that parent's address at a provider without controlling it.
- The 30-day session rules, sign-out, route authorisation and the admin API are unchanged; the callback sets the same cookie as password sign-in.
- Linking or unlinking from Settings, more providers, provider sign-in for readers and profile pictures from the provider are not built; a parent with two provider accounts of different e-mails gets two households.
- Production needs the two OAuth apps and the four environment values; until they are set, the pages look as before.

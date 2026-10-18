# ADR-0001: Admin API tokens for CLI authentication

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-049, L2-050, L2-055

## Context

The `shelfie-admin` CLI needs a credential that is separate from the web sign-in used by the reader and the parents (L1-017). It shall be least-privilege, revocable, expiring and rate limited, and a missing or expired credential shall fail clearly. The operator is the only admin and already has SSH access to the VM (docs/runbook.md).

Two options were weighed:

1. **Scoped admin API tokens.** The operator creates a token on the server, pastes it into `shelfie-admin login` once, and the CLI sends it as a bearer token. The server stores a hash, scopes and an expiry; revoking is one row update.
2. **Device-code login (RFC 8628).** The CLI asks the API for a device code, the operator approves it in the web app while signed in as a parent, and the CLI polls for an access token, plus a refresh token to keep it alive.

Device-code login avoids pasting a secret, but it needs a new approval page in the Angular app (with mocks, screen composition and component work under AGENTS.md), a polling endpoint, short-lived access tokens and refresh-token rotation. It also ties admin power to a parent web account, so any parent account would become an admin path. That is at least three times the code of option 1 for one operator.

## Decision

The CLI authenticates with admin API tokens.

- A token is `shfa_` followed by 32 random bytes in base64url (43 characters).
- A token has a name, the scopes `read` or `read write`, and an expiry of 1 to 90 days (30 by default).
- Tokens are created, listed and revoked by `npm run admin-token -w apps/api` on the server. The value is printed once at creation.
- The CLI sends `Authorization: Bearer <token>`. The API answers 401 `token-missing`, `token-invalid`, `token-expired` or `token-revoked`, and 403 `scope-missing`.
- Tokens are not tied to a household or profile. Web sessions never grant admin access, and tokens never grant web access.

## Consequences

- No UI work and no new browser flow; the whole credential model is two tables' worth of code.
- Provisioning needs one SSH step per token. The runbook documents it.
- The token is a bearer secret: anyone holding it can act until it expires or is revoked. Expiry, revocation, the rate limit (L2-051) and the audit log (ADR-0006) bound the damage.

# ADR-0005: Admin API versioning and exposure

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-050, L2-051, L2-053, L2-054

## Context

The CLI runs on the operator's own machine, whose public address changes. Production is one VM behind Caddy, which terminates TLS for `app.shelfie.kids` (ADR-0014) and proxies `/api/*` to the API on `127.0.0.1:3000` (docs/runbook.md). The web API's CSRF guard expects the browser-only header `X-Requested-With: Shelfie`.

## Decision

- **Prefix and version.** All admin endpoints live under `/api/admin/v1/`. A breaking change gets `/api/admin/v2/` alongside v1 until the CLI moves. The contract is `apps/api/admin-api.yaml` (OpenAPI 3.1); the API and the CLI are both built against it.
- **TLS.** The admin API is served through the existing Caddy site, so it gets the same certificate and HSTS. No Caddy change is needed: `/api/*` already reaches the API. The CLI refuses an `http` base URL unless the host is `localhost` or `127.0.0.1`, so a token is never sent in clear text.
- **Network.** No IP allow-list. Access rests on the token, HTTPS, the rate limit and the audit log. An allow-list would lock the operator out whenever the home address changes, the same problem the SSH rule already has.
- **Browser isolation.** The admin router is mounted before the CSRF guard because it accepts only bearer tokens, which browsers never attach on their own. It sends no CORS headers and never reads or sets cookies, so a page in a browser cannot call it with the operator's credentials.
- **Rate limit.** 60 calls per minute per source address, in memory. Behind Caddy every call has the proxy's address, so in production the limit applies to all admin traffic together, which suits one operator.

## Consequences

- No infrastructure change ships with the admin API; it goes live with the next deploy.
- If the token leaks, the attacker can reach the API from anywhere until the operator revokes it; the audit log shows every call.

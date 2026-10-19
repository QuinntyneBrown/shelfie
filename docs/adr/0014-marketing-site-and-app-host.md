# ADR-0014: A static marketing site at www.shelfie.kids, and the app moves to app.shelfie.kids

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-114, L2-118, L2-119, L2-120, L2-121

## Context

Shelfie needs a public page that tells families what it is, like TwinkleTune's marketing page, while the Angular app keeps working. The app and its API share one origin today (`shelfie.kids`), the session cookie is host-only and `SameSite=Strict`, and everything runs behind one Caddy on one VM. TwinkleTune serves its page from Azure Static Web Apps. `AGENTS.md` requires every Shelfie UI to be built from the `components` library, which lives in the Angular workspace.

## Decision

1. **Hosts.** `www.shelfie.kids` serves the marketing page; `app.shelfie.kids` serves the app and `/api/*`, including `/api/admin/v1`; bare `shelfie.kids` redirects permanently, `/` to www and every other path to the same path on app.
2. **Same VM, same Caddy.** A `www.shelfie.kids` site block serves `/opt/shelfie/current/marketing` with its own strict security headers. No Static Web Apps.
3. **Static page outside the workspace.** `apps/marketing/` holds plain HTML, CSS and JS with no framework and no build step. It is not part of `apps/web`, so the components library rule does not apply to it; it uses a copy of the design tokens instead.
4. **Users sign in again.** The cookie stays host-only; no `Domain` attribute is added.

## Consequences

- The API stays same-origin with the app: no CORS, no cookie change, no code change in the app or API.
- Old bookmarks and already-sent reset and invite links keep working through the redirect.
- Everyone signs in once more after the move, and the operator logs `shelfie-admin` in again for the new URL.
- DNS gains `CNAME app`, which must exist before the release goes live, and production's `APP_URL` must change to `https://app.shelfie.kids`.
- The release tarball gains `marketing/`; it goes live and rolls back with the app.
- The page duplicates `tokens.css`; a token change must be copied to `apps/marketing/assets/tokens.css`.

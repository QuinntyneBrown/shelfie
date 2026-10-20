# ADR-0023: The operator approves directory profiles before parents see them

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-163, L2-168, L2-169, L2-170, L2-171

## Context

Authors and volunteers are strangers listed to parents of young children. Anyone can join. A profile could carry an unsuitable photo, text or link from its first minute.

## Decision

1. Every new author or volunteer profile starts `pending` and is invisible to parents. Its owner sees a "Waiting for approval" banner and can keep editing.
2. The operator lists profiles with `shelfie-admin profiles list` and sets one `approved` with `profiles approve <id>` or `hidden` with `profiles hide <id>`, through new admin API routes (`GET /api/admin/v1/profiles`, `POST /api/admin/v1/profiles/:id/approve`, `POST /api/admin/v1/profiles/:id/hide`). They use the existing token scopes, dry run and audit row (ADR-0001, ADR-0006).
3. A hidden profile, like a pending one, is absent from the directory, and its profile, catalogue, photo and covers answer 404 to parents. Its owner still signs in and sees "Hidden by Shelfie".
4. Edits after approval keep the profile listed. Re-approving every edit would hide a profile for each typo fix; the operator can hide it at any time instead.

## Consequences

- No public listing happens without a person looking at it first.
- The operator must check `profiles list` for new joins; nothing notifies them yet.
- A bad edit after approval is visible until the operator hides it. This is recorded as an accepted risk; re-approval on edit can be added later as a new decision.

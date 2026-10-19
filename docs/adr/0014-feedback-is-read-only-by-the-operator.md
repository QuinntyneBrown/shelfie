# ADR-0014: Feedback is stored per household and read only by the operator

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-115, L2-118, L2-119

## Context

Readers and parents can send feedback from the account menu (`L1-026`). It has to go somewhere the operator can read it, and it must not leak between households or outlive an erased household. Three places were considered: an e-mail to the operator on each send; a third-party feedback service; or a table in the Shelfie database read through the existing admin API and `shelfie-admin`.

E-mail needs the production mail provider, which is deferred, and sends household data out of Shelfie. A third-party service adds a dependency, a credential and a privacy review for a few notes a week. The admin API already has tokens with scopes, a rate limit and an audit log (ADR-0001, ADR-0005, ADR-0006), and every household table already cascades from `household` for erasure.

## Decision

1. **A `feedback` table**, `household_id` and `profile_id` cascading on delete, with the kind, an optional score of 1 to 5, an optional message of up to 1,000 characters and the time sent; a check keeps a score or a message.
2. **One write route, `POST /api/feedback`,** which takes the household and profile from the session only, behind the CSRF guard and a limit of 10 per profile in ten minutes.
3. **One read route, `GET /api/admin/v1/feedback`,** behind the `read` scope, and the CLI command `shelfie-admin feedback list`. The list carries the sender's role but not their name, username or e-mail.
4. **No household route reads feedback**, its own or another's.

## Consequences

- No new dependency, credential or outbound call; the admin audit and rate limit cover reading with no new code.
- The household erasure statement in `docs/runbook.md` removes feedback through the cascade, unchanged.
- The operator learns of new feedback only by running the command; a notification is deferred.
- A reader or parent cannot see what they sent before. That is intended: there is no screen to keep in step.

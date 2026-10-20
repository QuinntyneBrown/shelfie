# ADR-0023: Parents contact volunteers outside Shelfie, and Shelfie does not vet them

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-155, L2-165, L2-163

## Context

A parent who finds a reading volunteer needs a way to reach them. Messaging inside Shelfie would put a stranger one step from a household and needs moderation, notifications and abuse handling. Shelfie also has no way to check who a volunteer is.

## Decision

1. A volunteer writes a contact line of up to 120 characters on My profile, such as an e-mail address or a website. Parents read it on the volunteer's profile as plain text; Shelfie builds no link from it and sends nothing between parents and volunteers.
2. Shelfie does not run background or identity checks. The volunteers list and every volunteer profile say "Shelfie doesn’t vet volunteers" and advise meeting in public or online with the child's grown-up present.
3. Operator approval (ADR-0022) checks only that a profile is suitable to list.

## Consequences

- No messaging, booking or scheduling exists; they are deferred.
- The volunteer chooses what contact detail to publish, and it is shown only to signed-in parents of approved listings.
- The contact line is profile text, so it never reaches a log (L2-172).

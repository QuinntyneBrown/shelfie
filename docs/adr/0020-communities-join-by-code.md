# ADR-0020: Communities are joined by a short code and see only a family name and a count

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-145 to L2-153

## Context

Parents want to read together with other families: start a community, share a code, and see the community's progress toward a reading goal. The readers are children. Inside a community, another household may see only that household's display name and its count toward each goal (`L1-030`), never reader names, photos, usernames, titles, answers, notes or rewards. Households have no name today.

## Decision

1. **Tables.** `community(id, name, join_code UNIQUE, created_at)` and `community_member(community_id, household_id, display_name, joined_at)` with the primary key `(community_id, household_id)`. Both member columns cascade: erasing a household removes its memberships.
2. **A family name per membership.** Starting or joining asks for the name this household shows in that community ("The Bells"), 1 to 40 characters after trimming. It is the only thing of the household another member sees besides its count. No household name is added to Settings.
3. **Community name.** 1 to 40 characters after trimming.
4. **Join code.** Eight characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0, O, 1, I or L), made with `crypto.randomInt`, shown as `ABCD-EFGH`. Matching ignores case, spaces and hyphens. About 8.5 × 10^11 codes; a clash on insert retries. The code cannot be regenerated; regenerating is deferred.
5. **Rate limit.** Joining is limited to 10 tries per household in 10 minutes with the existing `rateLimiter` (`apps/api/src/rate-limit.ts`, the sign-in pattern), answering 429 `too-many-attempts` with `Retry-After`. A wrong code answers 404 `code-not-found`; a household already in the community answers 409 `already-member`.
6. **The starter manages the goal.** The community's owner is its member household that joined first; the one that started it joined first. Only the owner's parents set, change or remove the community's reading goal (403 `owner-only` otherwise). When the owner leaves, or is erased, ownership passes to the next household by join time; nothing is stored for it.
7. **Leaving.** Any parent of a member household can leave. When the last household leaves, the community and its goal are deleted. Removing another household, transferring ownership by hand and deleting a community that still has members are not built.
8. **Erasure.** Erasing a household (the runbook's one `DELETE`) removes its memberships through the cascade; the runbook's statement then deletes communities left with no member, so nothing a parent typed outlives the last family.
9. **Access.** Every community route needs a parent session (`requireRole('parent')`); a reader gets 403. A community the household is not a member of answers 404, whether it exists or not.
10. **Where.** Communities are reached from a fourth parent tab, "Community", at `/communities`. It also holds the household's reading goal (ADR-0021), so a parent has one place for reading together.

## Consequences

- A code shared outside the family lets any parent join; that is how it is meant to work, and Leave is always open.
- Community responses are built from `community_member.display_name` and counts only; they never join `profile` or read `book.title`, so a test can assert their exact keys.
- Request logs already carry route patterns only (`L2-085`), so community names, family names and codes never reach the log.

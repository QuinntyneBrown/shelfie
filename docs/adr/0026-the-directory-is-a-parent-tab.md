# ADR-0026: The directory is a parent tab; authors and volunteers land on My profile

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-164, L2-169, L2-174

## Context

Parents need a place to browse authors and volunteers. It could be a section reached from Books or Add a book, or a tab of its own. Authors and volunteers need a home page after sign-in, and navigation that shows only their own things (`docs/detailed-designs/shell/navigate-shell`).

## Decision

1. **Directory is a fourth parent tab**, after Books: Review, Books, Directory, Settings, in the top bar from 768 px and in `sh-tab-bar` on phones. Volunteers are not about books, so the directory does not sit under Books.
2. **Authors and volunteers land on My profile** (`/me`) after sign-in, sign-up and password reset, and the brand links there.
3. **An author's navigation** is My profile and My catalogue; a volunteer has only My profile, so their shell shows the brand and the avatar with no tabs. The account menu of either holds only Sign out, since feedback belongs to a household.
4. `sh-tab-bar` gains the icons `directory`, `profile` and `catalogue`.

## Consequences

- Every parent page shows four tabs; at 360 px each is about 90 px wide, above the 44 px target.
- Readers' navigation is unchanged and has no Directory.

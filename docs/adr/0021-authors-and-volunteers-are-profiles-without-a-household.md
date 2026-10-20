# ADR-0021: Authors and volunteers are profiles without a household

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-160, L2-164, L2-175, L2-176, L2-177, L2-179

## Context

Authors and reading volunteers (`L1-030`, `L1-031`) are grown-ups with accounts of their own, outside any household. Until now every `profile` row belonged to a household (`household_id NOT NULL`) and had the role `reader` or `parent`. Sign-in, sessions, the sign-in rate limit, password reset and photos all key off `profile`.

`requireSession` joins the session to its household and lets any role through; only `requireRole('parent')` turns readers away from parent routes. A new role on that path would pass every reader route.

The two options were new roles on `profile`, or a separate accounts table with its own sign-in and sessions.

## Decision

1. **New roles on `profile`.** Migration `014-directory.sql` adds the roles `author` and `volunteer`, makes `household_id` nullable, and adds a `CHECK` that the household is NULL exactly for those two roles. Profile details live in a new `directory_profile` table (status, about text, website, ages, contact line), and an author's books in `catalogue_book` and `catalogue_cover`. Sign-in, sessions, the rate limit, password reset and `profile_photo` are shared unchanged.
2. **One join page** at `/join` (`POST /api/auth/join`) with a choice of "I'm an author" or "I volunteer", an e-mail, a username and a password. The parent's sign-up is unchanged.
3. **Two session guards.** `requireSession` stays the household guard and answers 403 `household-only` to an author or volunteer session; every existing household route is closed by that one change. `requireDirectorySession` guards the new `/api/me` and `/api/catalogue-books` routes and answers 403 `directory-only` to a parent or reader (and `authors-only` to a volunteer on catalogue routes). In the web app `authGuard` sends an author or volunteer to the forbidden page, and new guards protect My profile and My catalogue.
4. **Their own photo URL.** A household photo is served at `/api/photos/:id` inside the household; an author's or volunteer's own photo at `/api/me/photo`, and to parents at `/api/directory/photos/:id` while the profile is approved.

## Consequences

- No new sign-in, session or reset code; usernames and e-mails stay unique across every account.
- Household isolation rests on one guard. The lock-down tests (`L2-175`) call every existing household route with an author and a volunteer session.
- Erasing an author or volunteer is one `DELETE FROM profile`, cascading to their profile, catalogue, pictures, sessions and resets (`docs/runbook.md`).
- Code that assumed every profile has a household (session loading, `createSession`'s theme) reads the household with a LEFT JOIN and uses the `device` theme without one.

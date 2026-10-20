# Estimate — Volunteer profile

## Basis

Hours for an intermediate Angular/TypeScript and Node.js developer, with `directory/author-profile` (migration, join route, session split, `me` router, `MyProfilePage`) in place. The hours cover the volunteer's schema and fields, the volunteer shell, the authors-only guard and their acceptance tests. [Detailed design](../../detailed-designs/directory/volunteer-profile/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Volunteer schema on `PUT /api/me` (ages, contact) | 1 |
| Volunteer fields on `MyProfilePage` and the join choice | 2 |
| Volunteer shell (no tabs, menu with Sign out) and `authorGuard` | 1 |
| API and Playwright acceptance tests | 3 |
| **Total** | **7** |

## Minimal scope

Join as a volunteer and save ages and a contact line, with the authors-only refusal. This satisfies `L2-154`, `L2-155`, `L2-157`, `L2-158` and `L2-170`. Total: 6 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Reuse the author's tab bar for volunteers | A volunteer sees a My catalogue tab that leads to the forbidden page | 1 |

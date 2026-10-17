# Estimate — Edit household settings

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The `core` library's `ApiClient` and `SessionService`, the `platform/` middleware (`validate`, `requireRole`, `problemDetailsHandler`) and the `argon2` hashing helper are assumed present from the `platform` and `sign-in` subsystems. `sh-text-field`, `sh-button`, `sh-banner`, `sh-skeleton` and `sh-error-state` are assumed paid for by earlier slices, and `sh-color-picker` by add-book in the `books` subsystem, so each is reused here at 0 hours. The Current password field marked `<TO SUPPLY>` in the design is assumed to be a single `sh-text-field` revealed inside the Grown-up section. [Detailed design](../../detailed-designs/settings/edit-household-settings/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `SettingsPage` Reader and Grown-up sections with `loading`, `error`, `default`, `invalid`, `submitting` and `success` states, client checks, the "Fix N things" summary and the revealed Current password field | 6 |
| `SettingsApi` (`get`, `save`), `SettingsView` and `SettingsPatch` types, `SessionService.update` wiring after save | 1 |
| `GET /api/settings`: router under `requireRole('grown-up')`, service, repo | 1 |
| `PATCH /api/settings`: `settingsPatchSchema`, service (current-password verify, e-mail uniqueness, argon2id hashing of PIN and password, counter reset), repo transaction | 4 |
| Playwright acceptance tests via `SettingsPage` page object (load, name and colour reflected in top bar, PIN change used at next sign-in, 4-digit error, password mismatch, wrong current password, failed save keeps values) | 3 |
| **Total** | **15** |

## Minimal scope

Reader name, colour and PIN plus the grown-up's display name, with the load, invalid, submitting and success states; e-mail and password changes and the Current password field are left out, so the Grown-up section shows the e-mail read-only. This still satisfies `L2-021` criteria 1, 2, 3 and 5 and defers criterion 4 (credential changes verified by the current password). Total: 10 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the "Fix N things" summary; keep per-field errors only | One-tap navigation to each problem on long phone forms | 1 |
| Drop the e-mail change; keep the password change | The grown-up cannot change the sign-in e-mail without database access; the uniqueness check is not built | 1 |
| Replace the skeleton `loading` state with the shared spinner | The settled layout shown while loading in the mocks | 1 |

# Estimate — Choose appearance

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object, and review fixes. They exclude the requirements, mocks and this design. The Settings page, `SettingsApi`, `GET /api/settings`, `PATCH /api/settings` and its transaction are assumed present from edit-household-settings; `SessionService` and the sign-in and session endpoints from the `core` library and the `sign-in` subsystem. `docs/design-system/tokens/tokens.css` is assumed complete, so the tokens are copied rather than written. The theme is cached in `localStorage` and `GET /api/auth/profiles` carries it; both are in the hours. [Detailed design](../../detailed-designs/settings/choose-appearance/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `ThemeService` in `core`: `apply(theme)`, `data-theme` on `<html>`, `matchMedia` resolution and `change` listener for `device`, `theme` and `resolved` signals, `localStorage` cache, hooked to `SessionService.set` and `clear` | 3 |
| Appearance radio group in `SettingsPage`, `theme` in `SettingsPatch`, `ThemeService.apply` after a successful save | 1 |
| `household.theme` in `settings.service.ts` and `settings.repo.ts` (`updateTheme`, `findHouseholdSettings`); `theme` joined into the session payload of `GET /api/auth/session`, `POST /api/auth/pin` and `POST /api/auth/password` | 2 |
| `tokens.css` in the `components` library from `docs/design-system/tokens/tokens.css`, loaded by the application styles | 1 |
| Playwright acceptance tests via `SettingsPage` page object with emulated colour scheme (device dark renders dark; saved light or dark seen by both profiles in a fresh context) | 2 |
| **Total** | **9** |

## Minimal scope

The three radio options, `household.theme` stored and returned in every session payload, and `ThemeService.apply` setting `data-theme` once per session without the `change` listener, so a device switch between light and dark during a session takes effect on the next page load. This still satisfies both `L2-022` criteria. Total: 6 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the `matchMedia` `change` listener; resolve the device preference once per session | A device that switches to dark at sunset keeps the app light until the next load | 1 |
| Drop the second acceptance test context; assert the saved theme for one profile only | Proof that the reader sees the grown-up's choice | 1 |

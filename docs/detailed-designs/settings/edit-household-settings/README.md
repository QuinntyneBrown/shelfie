# Edit household settings

## Overview

Shelfie is a web application that helps one child read books by logging each chapter she reads and answering short questions about it, while a grown-up in the same household reviews her answers and gives rewards. A **household** is the unit of tenancy: exactly one reader profile and one grown-up profile, sharing one bookshelf. A **profile** is one person in the household, with a role of `reader` or `grown_up`, a display name and an **avatar colour**, one of five pastel colours (Rose, Sky, Sun, Mint, Lilac) that tints the initial shown in the top bar and on the sign-in page.

This feature is the grown-up's Settings page. It holds the two people in the house and how each one signs in: the reader's name, avatar colour and **PIN** (the 4-digit code she enters on the sign-in page), and the grown-up's display name, e-mail address and password. The page is reachable only with a grown-up session; the reader never sees it. A third section of the same page, Appearance, is the choose-appearance feature and shares the same load and save calls.

Changes land in one save. The page validates what it can before sending (a PIN that is not 4 digits, two new-password boxes that differ) and lists each problem in a summary that links to the field. A change to the e-mail address or the password is a credential change, so the API asks for the **current password** and verifies it before writing anything. A failed save keeps every entered value on screen so the grown-up can fix one thing and save again.

The feature sits in the `settings` subsystem beside choose-appearance. Signing out from the link at the bottom of the page is owned by the `sign-in` subsystem (manage-session).

## Description

The slice runs from the Settings page to the `profile` table.

- **`SettingsPage`** — page component in the `settings` library, routed at `/settings` behind `grownUpGuard`. On entry it calls `SettingsApi.get()` and renders `sh-skeleton` cards (`loading`), an `sh-error-state` with Try again (`error`) or the form (`default`). The form has a Reader section (Name, Colour, New 4-digit PIN), a Grown-up section (Name Nia sees, E-mail address, New password, Type it again) and the Appearance section of choose-appearance, then a Sign out link and a Save settings `sh-button`. It owns the `invalid`, `submitting` and `success` states shown in `docs/mocks/pages/settings/`.
- **Client checks** — run on save, before any request: reader name 1–40 characters; PIN empty or exactly 4 digits (`Use exactly 4 digits.`); grown-up name 1–40 characters; e-mail in a valid format; new password empty or at least 8 characters, equal in both boxes (`These don't match. Type the same password in both boxes.`). Failures render an `sh-banner` (`danger`) headed `Fix N things` whose items link to the fields, each field carrying `aria-invalid` and its error text.
- **Current password** — an `sh-text-field` (`type="password"`, `autocomplete="current-password"`) that the page reveals in the Grown-up section when the e-mail differs from the loaded value or a new password is typed. The mocks do not show this field; `L2-021` criterion 4 requires it, so its exact placement is `<TO SUPPLY>` to the mocks.
- **`sh-text-field`**, **`sh-button`**, **`sh-banner`**, **`sh-skeleton`**, **`sh-error-state`** — components in the `components` library, reused from earlier slices.
- **`sh-color-picker`** — component in the `components` library: a `radiogroup` of swatches with visually hidden labels, arrow-key movement and a `checked` ring. The Reader section uses it with the five avatar colours.
- **`SettingsApi`** — service in the `settings` library built on `ApiClient`. `get()` calls `GET /api/settings` and returns `SettingsView`; `save(patch: SettingsPatch)` calls `PATCH /api/settings` and returns the updated `SettingsView` or throws `ApiError`.
- **`SettingsView`** — `{ reader: { name, color }, grownUp: { name, email }, theme }`.
- **`SettingsPatch`** — `{ reader: { name, color, pin? }, grownUp: { name, email, newPassword?, currentPassword? }, theme }`. The confirmation box is checked on the client only and is not sent.
- **`SessionService`** — service in the `core` library. After a successful save the page calls `update(name, color)` with the grown-up's values so `sh-top-bar` and the account menu re-render at once. The reader's name and colour reach her through `GET /api/auth/profiles` and `GET /api/auth/session` on her next sign-in, and reach the grown-up's other pages through their own responses.
- **`settings.router.ts`** — Express router under `requireRole('grown-up')`. `GET /api/settings` returns the view for the session's household. `PATCH /api/settings` validates the body with `settingsPatchSchema` through `validate()` (name 1–40, `color` in `rose|sky|sun|mint|lilac`, `pin` matching `/^[0-9]{4}$/`, `email` format, `newPassword` minimum 8, `theme` in `device|light|dark`) and calls the service.
- **`settings.service.ts`** — `getSettings(householdId)` and `updateSettings(householdId, profileId, patch)`. The update: when `email` differs from the stored value or `newPassword` is present, it requires `currentPassword` and verifies it with argon2id against the grown-up's `password_hash`, answering 400 problem type `current-password-invalid` on a mismatch; it refuses an e-mail already used by another profile with 409 problem type `email-in-use`; it hashes `pin` with argon2id into `profile.pin_hash` and resets `pin_failed_count` to 0 and `pin_locked_until` to NULL; it hashes `newPassword` into `password_hash`; it writes both profile rows and `household.theme` in one better-sqlite3 transaction.
- **`settings.repo.ts`** — parameterised SQL over `profile` and `household`: `findHouseholdSettings`, `findProfileByEmail`, `updateReader`, `updateGrownUp`, `updateTheme`.
- **`profile`** table columns used: `id`, `household_id`, `role`, `name`, `color`, `email`, `password_hash`, `pin_hash`, `pin_failed_count`, `pin_locked_until`.

The mocks ask for the new PIN once, in a single `New 4-digit PIN (optional)` field, where `L2-021` criterion 2 says twice; the design follows the mock, so the only PIN check is the 4-digit rule and the "mismatched PIN" case of criterion 3 does not arise. On success the page shows an `sh-banner` (`success`) headed `Saved` with the copy from the mock and keeps the form on screen with the PIN and password boxes cleared. On a 500 or a network failure it shows an `sh-banner` (`danger`) and keeps every value (`L2-021` criterion 5). The source of the two-letter avatar initials (`MB` for a grown-up named `Dad` in the mocks) is `<TO SUPPLY>`.

## Requirements

The feature realizes the following level-2 (L2) requirement. It refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-021` | `L1-009` | The grown-up edits the reader's name, avatar colour and PIN and the grown-up's own display name, e-mail and password from Settings. A changed name or colour shall be reflected across the app; a new 4-digit PIN entered twice identically shall be required at the reader's next sign-in; a mismatched or non-4-digit PIN shall show inline errors; a change to e-mail or password shall require the current password, verified first; a failed save shall show an error and keep the entered values. |

## Diagrams

### System context

The grown-up edits the household from Shelfie; the reader is affected at her next sign-in.

![C4 system context for editing household settings](diagrams/c4-context.png)

### Containers

The Settings page in the Angular application loads and saves through the Express API, which reads and writes the two profile rows in the SQLite database.

![C4 container view for editing household settings](diagrams/c4-container.png)

### Components

Inside the API, the settings router guards the role, validates the body and delegates to `settings.service.ts`, which verifies the current password, hashes credentials and writes through `settings.repo.ts` in one transaction.

![C4 component view for editing household settings](diagrams/c4-component.png)

### Class structure

`SettingsPage` composes `sh-color-picker` and the text fields, calls `SettingsApi` and updates `SessionService`; the service maps `SettingsPatch` onto the two `Profile` rows.

![Class diagram for editing household settings](diagrams/class-structure.png)

### Behaviour — load settings

The page requests the current values on entry and shows the skeleton until they arrive; the alternate path shows the error state with Try again.

![Sequence diagram for loading settings](diagrams/sequence-load-settings.png)

### Behaviour — save settings

The happy path writes both profiles in one transaction and confirms with `Saved`; the alternate paths show client validation, a wrong current password, an e-mail already in use and a server failure, each keeping the entered values (`L2-021`).

![Sequence diagram for saving settings](diagrams/sequence-save-settings.png)

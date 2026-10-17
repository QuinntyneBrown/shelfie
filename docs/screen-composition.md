# Screen composition

Which `components` library parts build each page, dialog, notification and shell part in the mocks, and what each screen must build locally.

- **Sources:** `docs/mocks/` (23 screens, 101 state files; routes and titles from `docs/mocks/index.html` and `manifest.json`) and the component catalogue below, which is the set of `sh-*` components the detailed designs (`docs/detailed-designs/*/*/README.md`) assign to the `components` library, plus the `core` services `ToastService` and `BannerService`.
- **Local UI** is markup and styling a feature library (or the `shelfie` application, for the shell) builds itself, because no catalogue component covers it.
- Mock-only chrome (`mock-bar`, `mock-note`) and the mocks' inline `<style>` workarounds are excluded.
- Layout classes from the design-system stylesheet (`container`, `stack`, `cluster`, `grid`, `span-*`, `page-header`, `card`, `section`, `visually-hidden`, `text-*`, `icon`) are global CSS, not components. They are used freely and not listed below.

## Component catalogue

| Selector | Class | In `public-api.ts` | Introduced by |
|---|---|---|---|
| `sh-profile-card` | `ProfileCard` | yes | sign-in/sign-in-with-pin |
| `sh-pin-keypad` | `PinKeypad` | yes | sign-in/sign-in-with-pin |
| `sh-button` | `Button` | no | sign-in/sign-in-with-password |
| `sh-text-field` | `TextField` | no | sign-in/sign-in-with-password |
| `sh-textarea` | `Textarea` | no | reading-log/log-chapter |
| `sh-question-field` | `QuestionField` | no | reading-log/log-chapter |
| `sh-segmented` | `Segmented` | no | reading-log/log-chapter |
| `sh-color-picker` | `ColorPicker` | no | books/add-book |
| `sh-sticker-picker` | `StickerPicker` | no | books/add-book, review/review-chapter |
| `sh-cover` | `Cover` | no | books/view-shelf |
| `sh-progress` | `Progress` | no | books/view-shelf |
| `sh-book-card` | `BookCard` | no | books/view-shelf |
| `sh-reward-card` | `RewardCard` | no | books/view-shelf |
| `sh-chapter-row` | `ChapterRow` | no | books/view-book |
| `sh-streak-badge` | `StreakBadge` | no | reading-log/track-streak |
| `sh-activity-item` | `ActivityItem` | no | review/review-queue |
| `sh-celebration` | `Celebration` | no | reading-log/celebrate-finished-book |
| `sh-skeleton` | `Skeleton` | no | books/view-shelf |
| `sh-empty-state` | `EmptyState` | no | books/view-shelf |
| `sh-error-state` | `ErrorState` | no | books/view-shelf |
| `sh-dialog` | `Dialog` | no | books/manage-book |
| `sh-menu` | `Menu` | no | shell/navigate-shell |
| `sh-top-bar` | `TopBar` | no | shell/navigate-shell |
| `sh-tab-bar` | `TabBar` | no | shell/navigate-shell |
| `sh-banner` | `Banner` | no | shell/notify |
| `sh-toast` | `Toast` | no | shell/notify |
| `sh-toast-stack` | `ToastStack` | no | shell/notify |

Class names follow the existing `PinKeypad` / `ProfileCard` convention (no `Component` suffix); only those two exist so far. There is no `DialogService`: dialogs are feature components that wrap `sh-dialog`.

Composition rules that hold on every screen:

- `loading` → `sh-skeleton`. Load failure (`error` on a data page) → `sh-error-state`. First-run `empty` → `sh-empty-state`.
- Form `invalid` → `sh-banner` (`danger`, "Fix N things", items link to fields) plus the field's own error slot (`sh-text-field`, `sh-textarea`, `sh-question-field`).
- Save failure (`error` on a form page, `failed` in a dialog) → `sh-banner` (`danger`) with "Try again"; values are kept.
- `submitting` / `busy` → `sh-button` with `busy`; no new UI.

## Shell

| Part | Library | Local UI |
|---|---|---|
| Skip link | — | `<a href="#main">Skip to content</a>` in `AppComponent` |
| Top bar, reader | `sh-top-bar` (`variant: 'reader'`) with `sh-streak-badge` | — |
| Top bar, grown-up | `sh-top-bar` (`variant: 'grown-up'`) with nav links and Review count badge | — |
| Account menu | `sh-menu`, opened from the top-bar avatar | — |
| Tab bar (grown-up, phones) | `sh-tab-bar` with Review count | — |
| Banner slot | `sh-banner` per `BannerService.banners()` | — |
| Toast region | `sh-toast-stack` rendering `sh-toast` per `ToastService.toasts()` | — |
| Auth layout (sign-in, forgot-password, reset-password) | — | `auth-layout`, `auth-card`, logo and sticker header |

## Shared local components

These are local UI that more than one screen needs. Build once in the feature library that first needs it; each is a candidate for the catalogue under change control (AGENTS.md says reusable UI belongs in `components`).

| Item | Used by | Notes |
|---|---|---|
| Auth layout | sign-in, forgot-password, reset-password | centred card, logo, sticker |
| Book header | book, chapter, log-chapter, review-chapter, manage-book | `book-card` markup in the mocks: `sh-cover` + title + author / "chapter N of M" + optional `sh-progress`. Designs describe it as cover + title + progress, not `sh-book-card` |
| Breadcrumb | add-book, book, chapter, log-chapter, review-chapter, manage-book | `nav` with links and current page |
| Question and answer (read-only) | chapter, review-chapter | `qa`: number, question, answer |
| Feedback note | chapter (default), review-chapter (`reviewed`) | sticker + grown-up's note + date |
| Status badge | books, manage-book, shelf (Finished count) | `badge--info/success/warning`, plain `badge`. The Review count badge belongs to `sh-top-bar` / `sh-tab-bar` |
| Book list row | books, review (queue), manage-book (questions list) | `list__item`: `sh-cover` sm, title, meta, trailing action |
| Stat | review, give-reward background | label + value |
| Error-page body | not-found, forbidden, server-error, offline | the designs say `sh-error-state`; the mocks show `empty` with a large sticker — use `sh-error-state` |

## Pages

### Reader and sign-in

#### Sign in — `/sign-in` (`pages/sign-in`: default, pin, pin-invalid, locked, password, invalid, submitting, error, expired)
- **Library:** `sh-profile-card` ×2 (default); `sh-pin-keypad` (pin, pin-invalid with its error slot, locked with `lockedUntil`); `sh-banner` `warning` (locked), `info` (expired, above the picker), `danger` (invalid summary; error with "Try again"); `sh-text-field` `password` + `sh-button` primary block (password, invalid, submitting, error); `sh-button` ghost "Not you?" / "Switch reader".
- **Local:** auth layout; large avatar with "Hi Dad!" / reader name heading on the pin and password steps.

#### Forgot password — `/forgot-password` (`pages/forgot-password`: default, invalid, submitting, success, error)
- **Library:** `sh-text-field` `email`; `sh-button` primary block; `sh-banner` `danger` (invalid summary, error with "Try again").
- **Local:** auth layout; success confirmation text replaces the form.

#### Reset password — `/reset-password` (`pages/reset-password`: default, invalid, submitting, success, error)
- **Library:** `sh-text-field` `password` with help; `sh-button` primary block; `sh-banner` `danger` (invalid summary).
- **Local:** auth layout; success and error (expired link) replace the form with text and a link button.

#### My shelf — `/shelf` (`pages/shelf`: default, loading, empty, error, long)
- **Library:** shell reader top bar; `sh-book-card` (reading and up-next grids, with `sh-cover` and `sh-progress`); `sh-reward-card` (trophy shelf); `sh-button`; `sh-skeleton` (loading); `sh-empty-state` (empty); `sh-error-state` (error). `long` adds rows only.
- **Local:** greeting and summary line; keep-reading **hero** (`hero`: eyebrow, title, `sh-cover` lg, `sh-progress`, primary action); section headings with status badge.

#### Book — `/books/:id` (`pages/book`: default, loading, error, finished, edge)
- **Library:** `sh-cover` lg; `sh-progress` lg; `sh-button` primary "I read Chapter N"; `sh-chapter-row` per chapter (done, next, future); `sh-reward-card` (finished, or "Dad is picking your reward"); `sh-skeleton`; `sh-error-state`.
- **Local:** breadcrumb; book header; finished hero with large sticker (finished); accordion "Earlier chapters" collapsing a long list (edge).

#### Add a book — `/books/new` (`pages/add-book`: default, invalid, submitting, error)
- **Library:** `sh-text-field` ×3 (title, author optional, chapter count `number` with help); `sh-color-picker` (7 cover colours); `sh-sticker-picker` (emoji grid); `sh-cover` xl (live preview); `sh-button` primary lg + ghost "Cancel"; `sh-banner` `danger` (invalid summary; error with "Try again").
- **Local:** breadcrumb; preview panel layout; form actions bar.

#### Log a chapter — `/books/:id/chapters/:n/log` (`pages/log-chapter`: default, loading, error, invalid, submitting, success, finished)
- **Library:** `sh-cover`; `sh-segmented` (Today / Yesterday / Another day); `sh-question-field` per question; `sh-button` primary lg "I'm done!" + ghost "Not yet"; `sh-banner` `danger` (invalid summary); `sh-skeleton`; `sh-error-state`; `sh-celebration` (`variant: 'chapter'` on success with `sh-progress` lg; `variant: 'book'` on finished with `sh-cover` xl).
- **Local:** breadcrumb; book header; the date input inside the "Another day" chip (inferred: the `sh-segmented` design does not mention an embedded input); form actions bar; celebration copy and sticker.

#### Chapter answers — `/books/:id/chapters/:n` (`pages/chapter`: default, pending, loading, error)
- **Library:** `sh-cover`; `sh-button` ghost / primary; `sh-banner` `info` "Waiting for Dad" (pending); `sh-skeleton`; `sh-error-state`.
- **Local:** breadcrumb; book header; question and answer list; feedback note (default only).

### Grown-up

#### Review — `/review` (`pages/review`: default, loading, empty, error, long)
- **Library:** shell grown-up top bar + `sh-tab-bar`; `sh-cover` sm; `sh-button` sm; `sh-activity-item` (recent activity feed); `sh-skeleton`; `sh-empty-state`; `sh-error-state`. `long` drops the side panel and adds rows.
- **Local:** queue list rows; "Matilda is finished!" reward card (`sh-cover` + text + "Give a reward" button); stats panel.

#### Review a chapter — `/review/chapters/:id` (`pages/review-chapter`: default, loading, error, invalid, submitting, success, reviewed)
- **Library:** `sh-cover`; `sh-sticker-picker`; `sh-textarea` (note, optional); `sh-button` primary lg; `sh-banner` `danger` (invalid summary); `sh-skeleton`; `sh-error-state`; `sh-celebration` (success).
- **Local:** breadcrumb; book header; question and answer list; feedback note (reviewed).

#### Books — `/books` (`pages/books`: default, loading, empty, error)
- **Library:** `sh-cover` sm; `sh-button` primary / sm "Manage"; `sh-skeleton`; `sh-empty-state`; `sh-error-state`.
- **Local:** book list rows with status badge (info / success / warning).

#### Manage a book — `/books/:id/manage` (`pages/manage-book`: default, loading, error, invalid, submitting, success, rewarded)
- **Library:** `sh-cover` lg; `sh-progress` lg; `sh-text-field` (title, author, chapter count); `sh-button` primary / ghost / danger / sm; `sh-banner` `danger` (invalid summary); `sh-skeleton`; `sh-error-state`. Opens `DeleteBookDialog` and `EditQuestionDialog`.
- **Local:** breadcrumb; book header with status badge; questions list; chapters table (`table-wrap--flush`, truncated cells); danger zone; inline save status "Saving…" / "Saved" (submitting, success); reward line with sticker (rewarded).

#### Settings — `/settings` (`pages/settings`: default, loading, error, invalid, submitting, success)
- **Library:** `sh-text-field` (names, e-mail, PIN, password); `sh-color-picker` (5 avatar colours); `sh-button` primary / ghost; `sh-banner` `danger` (invalid summary), `success` "Saved"; `sh-skeleton`; `sh-error-state`.
- **Local:** Appearance radio group (native radios styled as `choice` rows: device / light / dark).

### Error pages

#### Page not found — `/*`, Grown-ups only — `/review` as reader, Something went wrong — HTTP 500 (`pages/not-found`, `pages/forbidden`, `pages/server-error`: default)
- **Library:** shell top bar of the current role (server-error shows the grown-up shell with `sh-tab-bar`); `sh-error-state` with `sh-button` primary.
- **Local:** large sticker in the error-state icon slot.

#### Offline — `/*` offline (`pages/offline`: default)
- **Library:** shell reader top bar; `sh-banner` `warning` "You're offline"; `sh-error-state` with `sh-button` primary.
- **Local:** large sticker in the error-state icon slot.

## Dialogs

| Dialog (mock folder: states) | Overlay surface | Library | Local UI |
|---|---|---|---|
| Give a reward (`dialogs/give-reward`: default, busy, invalid, failed) | `sh-dialog`, bottom sheet under 640 px, over Review | `sh-cover` sm, `sh-text-field` (reward), `sh-textarea` (note, optional), `sh-button` primary / ghost / icon close; `sh-banner` `danger` (failed) | "Quick picks" chip buttons (local per the give-reward design) |
| Remove a book (`dialogs/delete-book`: default, busy, failed) | `sh-dialog`, destructive, over Manage a book | `sh-button` danger / ghost / icon close; `sh-banner` `danger` (failed) | danger icon in the dialog header |
| Add / edit a question (`dialogs/edit-question`: default, busy, invalid, failed) | `sh-dialog`, form, over Manage a book | `sh-textarea` (question, with field error on invalid), `sh-button` primary / ghost / icon close; `sh-banner` `danger` (failed) | — |
| Account menu (`dialogs/account-menu`: default, parent) | `sh-menu` popover from the `sh-top-bar` avatar, over shelf (default) or Review (parent) | `sh-menu` with header (name + streak for reader, e-mail + role for grown-up) and items | — |

## Notifications

| Notification (mock folder: states) | Surface | Library | Local UI |
|---|---|---|---|
| Toast (`notifications/toast`: info, success, warning, danger, with-action, stacked) | `sh-toast-stack` region, lifted above `sh-tab-bar` on phones | `sh-toast` (severity icon, title, text, optional action, close, timer bar), via `ToastService.show()` | — |
| Banner (`notifications/banner`: info, success, warning, danger, persistent) | banner slot under the top bar | `sh-banner` (severity, title, body, optional action, close when dismissible), via `BannerService.show()` | — |

## Summary of local UI to build

1. Skip link (`shelfie` application shell).
2. Auth layout — sign-in, forgot-password, reset-password.
3. Large avatar + greeting on the sign-in pin and password steps.
4. Book header — book, chapter, log-chapter, review-chapter, manage-book.
5. Breadcrumb — six pages.
6. Status badge — books, manage-book, shelf.
7. Book list row — books, review, manage-book.
8. Shelf greeting, summary line and keep-reading hero.
9. Book finished hero and the "Earlier chapters" accordion (edge).
10. Add-book preview panel and form actions bar (also log-chapter, review-chapter, settings).
11. "Another day" date input inside the log-chapter `sh-segmented`.
12. Question and answer list — chapter, review-chapter.
13. Feedback note — chapter, review-chapter.
14. Review reward card and stats panel.
15. Manage-book questions list, chapters table, danger zone, inline save status, rewarded line.
16. Settings Appearance radio group.
17. Give-reward "Quick picks" chips.
18. Delete-book danger icon.
19. Error-page sticker in `sh-error-state`'s icon slot.

## Inferred, not read from a mock

- Class names for all `sh-*` components except `ProfileCard` and `PinKeypad` (only those exist in code).
- Mock `alert` blocks map to `sh-banner`, and mock `empty` blocks on the four error pages map to `sh-error-state`, because the detailed designs say so.
- The log-chapter "Another day" date input is local, since `sh-segmented` is described only as a group of chips.
- The mocks carry no requirement IDs, so none are listed here; see each feature's detailed design.

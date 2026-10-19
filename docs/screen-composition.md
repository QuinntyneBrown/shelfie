# Screen composition

Which `components` library parts build each page, dialog, notification and shell part in the mocks, and what each screen must build locally.

- **Sources:** `docs/mocks/` (32 screens, 200 state files; routes and titles from `docs/mocks/index.html` and `manifest.json`) and the component catalogue below, which is the set of `sh-*` components the detailed designs (`docs/detailed-designs/*/*/README.md`) assign to the `components` library, plus the `core` services `ToastService` and `BannerService`.
- **Local UI** is markup and styling a feature library (or the `shelfie` application, for the shell) builds itself, because no catalogue component covers it.
- Mock-only chrome (`mock-bar`, `mock-note`) and the mocks' inline `<style>` workarounds are excluded.
- Layout classes from the design-system stylesheet (`container`, `stack`, `cluster`, `grid`, `span-*`, `page-header`, `card`, `section`, `visually-hidden`, `text-*`, `icon`) are global CSS, not components. They are used freely and not listed below.

## Component catalogue

| Selector | Class | In `public-api.ts` | Introduced by |
|---|---|---|---|
| `sh-button` | `Button` | no | sign-in/sign-in-with-password |
| `sh-text-field` | `TextField` | no | sign-in/sign-in-with-password |
| `sh-combobox` | `Combobox` | no | books/autocomplete-book |
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
| `sh-streak-reward-badge` | `StreakRewardBadge` | no | review/streak-rewards |
| `sh-streak-reward-card` | `StreakRewardCard` | no | review/streak-rewards |
| `sh-achievement-badge` | `AchievementBadge` | no | reading-log/earn-badges |
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
| `sh-avatar` | `Avatar` | yes | settings/upload-profile-photo |
| `sh-photo-picker` | `PhotoPicker` | yes | settings/upload-profile-photo |
| `sh-suggestion` | `Suggestion` | yes | books/suggest-questions |
| `sh-cover-picker` | `CoverPicker` | yes | books/upload-book-cover |
| `sh-sticker` | `Sticker` | yes | review/reward-gallery |
| `sh-picture-list` | `PictureList` | yes | review/reward-gallery |

Class names carry no `Component` suffix. There is no `DialogService`: dialogs are feature components that wrap `sh-dialog`. `sh-text-field` with `type: 'password'` draws the Show password button and accepts `readonly`; `sh-banner` with `summary` is the focusable "Fix N things" summary. `sh-avatar` draws a person's photo over their initial and colour, and falls back to the initial when there is no photo or it fails to load; every avatar on every screen is an `sh-avatar`. `sh-cover` takes an optional `image`, the book's cover picture, drawn over its colour and sticker; it falls back to them when there is no picture or it fails to load. `sh-book-card` and `sh-reward-card` pass a `coverImage` through to their `sh-cover`, and every `sh-cover` on every screen is given the book's `coverImage`. Given a `target` instead of a book, `sh-reward-card` is a gallery reward (its `unit` is `books`, or `days` for a streak reward, which changes only the progress label) (`.trophy--gallery`): an `sh-sticker` lg in place of the cover showing the reward's `picture` (its featured picture) over a 🎁, which it falls back to when there is no picture or it fails to load; the name, the note, the reward's `description` when it has one, and, with `progress`, the goal border, badge and `sh-progress`; its projected content is the action ("Pick this"). `sh-sticker` draws an emoji sticker, optionally with a picture over it, and every reward picture on every screen is an `sh-sticker`. `sh-picture-list` shows a reward's pictures as thumbnails with the featured mark, Make featured, Remove, Try again, Add a picture and Choose one of ours, which opens Shelfie's own pictures and emits the chosen one as a picked file.

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
| Top bar, parent | `sh-top-bar` (`variant: 'parent'`) with nav links and Review count badge | — |
| Account menu | `sh-menu`, opened from the top-bar `sh-avatar` (photo or initial). The reader's menu has "My photo", which opens `ProfilePhotoDialog`; both menus have "Send feedback", which opens `SendFeedbackDialog` | — |
| Tab bar (parent, phones) | `sh-tab-bar` with Review count | — |
| Banner slot | `sh-banner` per `BannerService.banners()` | — |
| Toast region | `sh-toast-stack` rendering `sh-toast` per `ToastService.toasts()` | — |
| Auth layout (sign-in, sign-up, accept-invite, forgot-password, reset-password) | — | `auth-layout`, `auth-card`, logo and sticker header |

## Shared local components

These are local UI that more than one screen needs. Build once in the feature library that first needs it; each is a candidate for the catalogue under change control (AGENTS.md says reusable UI belongs in `components`).

| Item | Used by | Notes |
|---|---|---|
| Auth layout | sign-in, sign-up, accept-invite, forgot-password, reset-password | `sh-auth-layout` in the `sign-in` library: centred card and logo mark |
| Switch | sign-in ("Keep me signed in") | `switch`: checkbox with label, checked by default. The catalogue has no checkbox or switch |
| Person list row | settings (Parents, Readers) | `list__item`: `sh-avatar`, name, `@username` or e-mail, optional "Invited" badge, trailing action ("Edit", "Send again") |
| Book header | book, chapter, log-chapter, review-chapter, manage-book | `book-card` markup in the mocks: `sh-cover` + title + author / "chapter N of M" + optional `sh-progress`. Designs describe it as cover + title + progress, not `sh-book-card` |
| Breadcrumb | add-book, book, chapter, log-chapter, review-chapter, manage-book | `nav` with links and current page |
| Question and answer (read-only) | chapter, review-chapter | `qa`: number, question, answer; on review-chapter, after Dad asks the review assistant, a flagged answer gains an `sh-banner` `warning` "Talk about this" with the reason (never shown to the reader) |
| Feedback note | chapter (default), review-chapter (`reviewed`) | sticker + parent's note + date |
| Status badge | books, manage-book, shelf (Finished count), settings ("Invited") | `badge--info/success/warning`, plain `badge`. The Review count badge belongs to `sh-top-bar` / `sh-tab-bar` |
| Book list row | books, review (queue), manage-book (questions list) | `list__item`: `sh-cover` sm, title, meta, trailing action |
| Stat | review, give-reward background | label + value |
| Error-page body | not-found, forbidden, server-error, offline | the designs say `sh-error-state`; the mocks show `empty` with a large sticker — use `sh-error-state` |

## Pages

### Reader and sign-in

#### Sign in — `/sign-in` (`pages/sign-in`: default, missing, invalid, submitting, error, expired)
- **Library:** `sh-text-field` ×2 (username; `password`); `sh-button` primary lg block "Sign in" (`busy` when submitting); `sh-banner` `info` "You were signed out" above the card (expired), `danger` (missing: "Fill in 2 things" summary with field errors; invalid: wrong credentials; error with "Try again").
- **Local:** auth layout; "Keep me signed in" switch; "Forgot your password?" link; "New here? Create a parent account" link under the card.

#### Create a parent account — `/sign-up` (`pages/sign-up`: default, invalid, taken, submitting, error)
- **Library:** `sh-text-field` ×5 (your name, e-mail `email`, username with help "3–20 letters, numbers, . or _", `password` with help "At least 8 characters", "Type it again" `password`); `sh-button` primary lg block (`busy` when submitting); `sh-banner` `danger` (invalid and taken: "Fix N things" summary with field errors, "That e-mail already has an account. Sign in?"; error with "Try again").
- **Local:** auth layout; heading and subtitle; the password pair laid out side by side.

#### Join a household — `/accept-invite` (`pages/accept-invite`: default, invalid, taken, submitting, error)
- **Library:** `sh-text-field` ×5 (e-mail `readonly`, your name, username, `password`, "Type it again"); `sh-button` primary lg block (`busy` when submitting); `sh-banner` `danger` (invalid and taken: summary with field errors).
- **Local:** auth layout; inviting-household header (`sh-avatar` lg with the inviter's initial and never a photo, because the page is signed out and photos are served only inside the household; "Join the Bells", "Marcus invited you."); `error` replaces the form with a sticker, "This invite has expired" (also shown for a used link) and a "Back to sign in" link button. The mock shows `error` as a message, not as `sh-error-state` (inferred below).

#### Forgot password — `/forgot-password` (`pages/forgot-password`: default, invalid, submitting, success, error)
- **Library:** `sh-text-field` `email`; `sh-button` primary block; `sh-banner` `danger` (invalid summary, error with "Try again").
- **Local:** auth layout; success confirmation text replaces the form.

#### Reset password — `/reset-password` (`pages/reset-password`: default, invalid, submitting, success, error)
- **Library:** `sh-text-field` `password` with help; `sh-button` primary block; `sh-banner` `danger` (invalid summary).
- **Local:** auth layout; success and error (expired link) replace the form with text and a link button.

#### My shelf — `/shelf` (`pages/shelf`: default, badges-none, badges-all, streak-progress, streak-earned, streak-given, loading, empty, error, long, goal-empty, goal-none, goal-progress, goal-reached, goal-error)
- **Library:** shell reader top bar; "Streak rewards": `sh-streak-reward-card` per reward (its `sh-streak-reward-badge`, and `progress` on the next one: a path of days for 7, `sh-progress` for 30 and 100), `sh-celebration` `book` with `sh-streak-reward-badge` above the list when one is earned (streak-progress, streak-earned, streak-given); `sh-achievement-badge` in a "Badges" section after Finished (default: two earned; badges-none: all locked; badges-all: all earned); `sh-book-card` (reading and up-next grids, with `sh-cover` and `sh-progress`); `sh-reward-card` (trophy shelf); `sh-button`; `sh-skeleton` (loading); `sh-empty-state` (empty); `sh-error-state` (error). `long` adds rows only. "Reading toward": `sh-reward-card` with `target`, `picture` (the featured picture, or the 🎁) and `description` per gallery reward, `progress` on her goal, and a projected `button.btn.btn--sm` "Pick this" while no goal is reached (goal-none, goal-progress); `sh-celebration` `book` above the list (goal-reached); `sh-empty-state` (goal-empty: "No rewards to pick yet"; goal-error: `tone="error"` with "Try again").
- **Local:** greeting and summary line; keep-reading **hero** (`hero`: eyebrow, title, `sh-cover` lg, `sh-progress`, primary action); section headings with status badge; the "Reading toward" heading and intro line, and the reached message inside `sh-celebration`.

#### Book — `/books/:id` (`pages/book`: default, loading, error, finished, edge, picture)
- **Library:** `sh-cover` lg; `sh-progress` lg; `sh-button` primary "I read Chapter N"; `sh-chapter-row` per chapter (done, next, future); `sh-reward-card` (finished, or "Dad is picking your reward"); `sh-skeleton`; `sh-error-state`.
- **Local:** breadcrumb; book header; finished hero with large sticker and a plain `a.btn[download]` "Print my certificate" to `/api/books/:id/certificate.pdf` (finished, L2-120); accordion "Earlier chapters" collapsing a long list (edge). `picture` is the same page with a cover picture on the `sh-cover`; no new UI.

#### Add a book — `/books/new` (`pages/add-book`: default, suggestions, suggestions-ai, searching, no-matches, lookup-failed, picked, invalid, submitting, error, picture, wrong-file, too-large, covers-loading, covers, covers-empty, covers-failed)
- **Library:** `sh-combobox` (title: the text field with its dropped list of matches, each row an `sh-cover` sm with the catalogue cover or the 📖 placeholder, title and author, a `Suggested` badge on AI rows; its own searching, no-matches and lookup-failed notes); `sh-text-field` ×2 (author optional, chapter count `number` with help); `sh-color-picker` (7 cover colours); `sh-sticker-picker` (emoji grid); `sh-cover-picker` ("Cover picture (optional)": Add a picture / Change picture, Remove picture, inline type and size errors); `sh-button` ghost "More covers" (after a catalogue match is picked); `sh-dialog` "Pick a cover" holding `sh-cover-gallery` (radio grid of `sh-cover` tiles, with its own loading, empty and failed states) and `sh-button` primary "Use this cover" + ghost "Cancel"; `sh-cover` xl (live preview, with the chosen or fetched picture); `sh-button` primary lg + ghost "Cancel"; `sh-banner` `danger` (invalid summary; error with "Try again").
- **Local:** breadcrumb; preview panel layout; form actions bar; the pick handler that fills author, chapters and picture from the chosen match; the handler that loads the covers when the dialog opens and sets the chosen one as the picture. A picture that fails to upload after the book is saved → `ToastService` `warning` on the shelf; no new UI.

#### Log a chapter — `/books/:id/chapters/:n/log` (`pages/log-chapter`: default, dictating, dictation-denied, loading, error, invalid, submitting, success, finished)
- **Library:** `sh-cover`; `sh-segmented` (Today / Yesterday / Another day); `sh-question-field` per question (it draws its own "Speak your answer" microphone button when the browser supports speech recognition: `dictating`, `dictation-denied`); `sh-button` primary lg "I'm done!" + ghost "Not yet"; `sh-banner` `danger` (invalid summary); `sh-skeleton`; `sh-error-state`; `sh-celebration` (`variant: 'chapter'` on success with `sh-progress` lg; `variant: 'book'` on finished with `sh-cover` xl).
- **Local:** breadcrumb; book header; the date input inside the "Another day" chip (inferred: the `sh-segmented` design does not mention an embedded input); form actions bar; celebration copy and sticker.

#### Chapter answers — `/books/:id/chapters/:n` (`pages/chapter`: default, pending, loading, error)
- **Library:** `sh-cover`; `sh-button` ghost / primary; `sh-banner` `info` "Waiting for Dad" (pending); `sh-skeleton`; `sh-error-state`.
- **Local:** breadcrumb; book header; question and answer list; feedback note (default only).

### Parent

#### Review — `/review` (`pages/review`: default, loading, empty, error, long, goal-reached, streak-reached)
- **Library:** shell parent top bar + `sh-tab-bar`; `sh-achievement-badge` in a read-only "Nia’s badges" card under This week; `sh-cover` sm; `sh-button` sm; `sh-activity-item` (recent activity feed); `sh-skeleton`; `sh-empty-state`; `sh-error-state`. `long` drops the side panel and adds rows.
- **Local:** queue list rows; the streak-reward card (streak-reached: 🎁 `sticker`, "Nia reached a 7-day streak", "Her reward: Ice cream", `sh-button` "Give it"); "Matilda is finished!" reward card (`sh-cover` + text + "Give a reward" button + a plain `a.btn.btn--ghost[download]` "Print certificate" to `/api/books/:id/certificate.pdf`, L2-120); on the book that reached her goal (goal-reached) the card adds the line "🎯 Nia reached her goal: Trip to the zoo" and its button opens Give a reward with the goal's name typed in; stats panel.

#### Review a chapter — `/review/chapters/:id` (`pages/review-chapter`: default, loading, error, invalid, submitting, success, reviewed, assist-busy, assist-flagged, assist-clear, assist-drafted, assist-failed, assist-unavailable)
- **Library:** `sh-cover`; `sh-sticker-picker`; `sh-textarea` (note, optional); `sh-button` primary lg; `sh-banner` `danger` (invalid summary); `sh-skeleton`; `sh-error-state`; `sh-celebration` (success). Review assistant, pending chapters only (absent on `reviewed`): `sh-banner` `warning` "Talk about this" under each flagged answer and "N answers to talk about" in the feedback card (assist-flagged, assist-drafted), `success` "Every answer looks good" (assist-clear), `info` "Suggested note" with a "Use draft" action (disabled with its reason while the note has words), `info` "The assistant isn’t set up" (assist-unavailable), `danger` "The assistant couldn’t help this time" with "Try again" (assist-failed).
- **Local:** breadcrumb; book header; question and answer list; feedback note (reviewed); "Help me review" button (`btn`, `type="button"`, `aria-busy` while the assistant reads, assist-busy) with its one-line hint, and the banners' small `btn btn--sm` actions, as other non-submit buttons in the app are written (`sh-button` is always a submit button).

#### Books — `/books` (`pages/books`: default, loading, empty, error)
- **Library:** `sh-cover` sm; `sh-button` primary / sm "Manage"; `sh-skeleton`; `sh-empty-state`; `sh-error-state`.
- **Local:** book list rows with status badge (info / success / warning).

#### Manage a book — `/books/:id/manage` (`pages/manage-book`: default, loading, error, invalid, submitting, success, rewarded, picture, uploading, picture-failed, wrong-file)
- **Library:** `sh-cover` lg (with the cover picture); `sh-progress` lg; `sh-cover-picker` in the book header ("Cover picture", uploads on choose; `busy` while uploading); `sh-banner` `danger` "The picture didn’t upload" / "The picture wasn’t removed" with "Try again" (picture-failed); `ToastService` `success` on a new picture; `sh-text-field` (title, author, chapter count); `sh-button` primary / ghost / danger / sm; `sh-banner` `danger` (invalid summary); `sh-skeleton`; `sh-error-state`. `sh-button` sm "Suggest questions" beside "Add a question" in the questions card. Opens `DeleteBookDialog`, `EditQuestionDialog` and `SuggestQuestionsDialog`.
- **Local:** breadcrumb; book header with status badge; questions list; chapters table (`table-wrap--flush`, truncated cells); danger zone; inline save status "Saving…" / "Saved" (submitting, success); reward line with sticker (rewarded); for a finished book, a plain `a.btn[download]` "Print certificate" to `/api/books/:id/certificate.pdf` in the rewarded card, or in a plain card before the reward (L2-120).

#### Settings — `/settings` (`pages/settings`: default, loading, error, invalid, submitting, success, photo, rewards-empty, streak-rewards-given)
- **Library:** `sh-avatar` in every Parents and Readers row (photo or initial); "Your account" section: `sh-avatar` lg and `sh-button` sm "Add a photo" / "Change photo" (opens `ProfilePhotoDialog`), `sh-text-field` (your name, username `readonly`, e-mail, new password, type it again, current password with help); `sh-button` primary "Save settings", ghost "Sign out", sm "Invite a parent" and "Add a reader" (open the dialogs below), sm ghost "Edit" and "Send again"; `sh-banner` `danger` (invalid summary), `success` "Saved"; `sh-skeleton`; `sh-error-state`. "Streak rewards" section: `sh-button` sm "Set a reward", ghost icon "Edit …" and "Remove …" per set row. "Rewards" section: `sh-sticker` per row (the featured picture, or the 🎁), `sh-button` sm "Add a reward", ghost icon "Edit …" and "Remove …" per row; `ToastService` `success` after a save or removal. Opens `InviteParentDialog`, `EditReaderDialog`, `ProfilePhotoDialog`, `GalleryRewardDialog` and the Remove a reward dialog.
- **Local:** Parents and Readers cards, each a heading plus a list of person list rows (parents: you, plus invited parents with an "Invited" badge; readers: name and `@username`); Rewards card: heading, explaining line, a list row per reward (`sh-sticker` md with the reward's featured picture over its 🎁, name, "Finish N books") or the "No rewards yet" line (rewards-empty); Appearance radio group (native radios styled as `choice` rows: device / light / dark).

### Error pages

#### Page not found — `/*`, Grown-ups only — `/review` as reader, Something went wrong — HTTP 500 (`pages/not-found`, `pages/forbidden`, `pages/server-error`: default)
- **Library:** shell top bar of the current role (server-error shows the parent shell with `sh-tab-bar`); `sh-error-state` with `sh-button` primary.
- **Local:** large sticker in the error-state icon slot.

#### Offline — `/*` offline (`pages/offline`: default)
- **Library:** shell reader top bar; `sh-banner` `warning` "You're offline"; `sh-error-state` with `sh-button` primary.
- **Local:** large sticker in the error-state icon slot.

## Dialogs

| Dialog (mock folder: states) | Overlay surface | Library | Local UI |
|---|---|---|---|
| Give a reward (`dialogs/give-reward`: default, busy, invalid, failed, goal) | `sh-dialog`, bottom sheet under 640 px, over Review | `sh-cover` sm, `sh-text-field` (reward), `sh-textarea` (note, optional), `sh-button` primary / ghost / icon close; `sh-banner` `danger` (failed) | "Quick picks" chip buttons (local per the give-reward design); `goal`: the reward field starts with the goal's name |
| Remove a book (`dialogs/delete-book`: default, busy, failed) | `sh-dialog`, destructive, over Manage a book | `sh-button` danger / ghost / icon close; `sh-banner` `danger` (failed) | danger icon in the dialog header |
| Add / edit a question (`dialogs/edit-question`: default, busy, invalid, failed) | `sh-dialog`, form, over Manage a book | `sh-textarea` (question, with field error on invalid), `sh-button` primary / ghost / icon close; `sh-banner` `danger` (failed) | — |
| Suggested questions (`dialogs/suggest-questions`: busy, none-selected, default, invalid, saving, success, empty, failed, unavailable) | `sh-dialog`, form, over Manage a book | `sh-suggestion` per idea (tick to keep, wording editable, field error on invalid; locked while saving), `sh-skeleton` rows (busy), `sh-empty-state` "No new ideas this time" with "Ask again" (empty), `sh-banner` `danger` with "Try again" (failed) and `info` (unavailable), `sh-button` primary "Add N questions" (`busy` while saving) / ghost "Ask again" / "Cancel" / "Close"; `ToastService` `success` "N questions added" (success) | intro line; "Thinking up questions…" status line; "Tick at least one question" hint |
| Add / edit a reader (`dialogs/edit-reader`: default, busy, invalid, failed, edit, taken, photo) | `sh-dialog`, form, over Settings | `sh-text-field` (name, username with help, `password` with help), `sh-color-picker` (5 avatar colours; help "Shows when Nia has no photo." when the reader has a photo), `sh-button` primary / ghost / icon close; `sh-banner` `danger` (invalid and taken: "Fix N things" summary; failed) | — |
| Add / edit a reward (`dialogs/edit-gallery-reward`: default, edit, pictures, uploading, picture-failed, wrong-file, library, too-many, invalid, busy, failed) | `sh-dialog`, form, over Settings | `sh-text-field` (reward name, `maxlength` 100, help; `type: 'number'` books to finish, help "A whole number from 1 to 20."), `sh-textarea` (description, optional, help "What makes it special. Up to 500 characters.", error "Use 500 characters or fewer." in invalid), `sh-picture-list` (pictures: featured mark, Make featured, Remove, Add a picture; uploading thumbnail busy and Add disabled; picture-failed with Try again; wrong-file type or size error; library with Choose one of ours open on Shelfie's pictures; too-many with Add disabled and help), `ToastService` `danger` "The picture wasn’t changed" when a removal or Make featured fails, `sh-button` primary "Add reward" / "Save changes" / ghost "Cancel" / icon close; `sh-banner` `danger` (invalid "Fix N things" summary; failed with "Try again") | — |
| Set / edit a streak reward (`dialogs/edit-streak-reward`: default, edit, invalid, busy, failed) | `sh-dialog`, form, over Settings | `sh-text-field` (reward name, `maxlength` 100, help), `sh-text-field` `type="number"` (amount in dollars, optional, help), `sh-button` primary "Set reward" / "Save changes" / ghost "Cancel" / icon close; `sh-banner` `danger` (failed with "Try again") | — |
| Remove a reward (`dialogs/remove-gallery-reward`: default, busy, failed) | `sh-dialog`, destructive, over Settings | `sh-button` danger "Remove reward" / ghost "Keep it" / icon close; `sh-banner` `danger` (failed) | danger icon in the dialog header |
| Invite a parent (`dialogs/invite-parent`: default, busy, invalid, failed, sent) | `sh-dialog`, form, over Settings | `sh-text-field` (`email`, help "The link works for 7 days."), `sh-button` primary "Send invite" / ghost "Cancel" / icon close; `sh-banner` `danger` (invalid summary; failed) | `sent` state: large sticker and "We e-mailed priya@example.com." with a "Done" button |
| Account menu (`dialogs/account-menu`: default, parent, photo, parent-photo) | `sh-menu` popover from the `sh-top-bar` `sh-avatar`, over shelf (default, photo) or Review (parent, parent-photo) | `sh-menu` with header (name + `@username` + streak for reader; name + `@username` + role for parent) and items: My photo, Send feedback and Sign out (reader), Settings, Send feedback and Sign out (parent) | — |
| Send feedback (`dialogs/send-feedback`: default, filled, idea, invalid, busy, failed, success, parent) | `sh-dialog`, bottom sheet under 640 px, over shelf (reader) or Review (parent, `parent`), from the account menu's Send feedback | `sh-sticker-picker` (score, five faces "1" to "5", optional, field error "Pick a face or write a message."), `sh-segmented` (kind: How it feels / An idea), `sh-textarea` (message, optional, help with characters left, label "What would make Shelfie better?" for An idea, error on invalid), `sh-button` primary "Send" (`busy` while sending) / ghost "Cancel" (`sh-dialog` has no close icon; Escape closes); `sh-banner` `danger` (invalid "Fix N things" summary; failed with "Try again"); `ToastService` `success` "Thanks! We read every note." (success) | intro line; a `fieldset` that locks the fields while sending |
| Your photo (`dialogs/profile-photo`: default, parent, choosing, busy, success, photo, too-large, invalid, failed) | `sh-dialog`, over shelf (reader, from My photo) or Settings (parent, from Add a photo) | `sh-photo-picker` (preview `sh-avatar` xl, Choose a photo / Choose another, Remove photo, help, inline type and size errors), `sh-button` "Done" / icon close; `sh-banner` `success` ("Looking great, Nia!") and `danger` (failed, with Try again) | intro line |

## Notifications

| Notification (mock folder: states) | Surface | Library | Local UI |
|---|---|---|---|
| Toast (`notifications/toast`: info, success, warning, danger, with-action, stacked) | `sh-toast-stack` region, lifted above `sh-tab-bar` on phones | `sh-toast` (severity icon, title, text, optional action, close, timer bar), via `ToastService.show()` | — |
| Banner (`notifications/banner`: info, success, warning, danger, persistent) | banner slot under the top bar | `sh-banner` (severity, title, body, optional action, close when dismissible), via `BannerService.show()` | — |

## Summary of local UI to build

1. Skip link (`shelfie` application shell).
2. Auth layout — sign-in, sign-up, accept-invite, forgot-password, reset-password.
3. Sign-in "Keep me signed in" switch, and the accept-invite household header and expired-invite message.
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
16. Settings Parents, Readers and Rewards lists (person list row, "Invited" badge, reward row) and Appearance radio group.
17. Give-reward "Quick picks" chips.
18. Delete-book and remove-reward danger icon.
19. Error-page sticker in `sh-error-state`'s icon slot.
20. Invite-parent `sent` confirmation (sticker, text, "Done").
21. Shelf "Reading toward" heading, intro line and reached message.
22. Send-feedback intro line and the `fieldset` that locks its fields while sending.

## Inferred, not read from a mock

- Mock `alert` blocks map to `sh-banner`, and mock `empty` blocks on the four error pages map to `sh-error-state`, because the detailed designs say so.
- The log-chapter "Another day" date input is local, since `sh-segmented` is described only as a group of chips.
- `sh-text-field` with `type: 'password'` includes the Show password button the sign-in, sign-up, accept-invite, settings and edit-reader mocks draw inside the input.
- The accept-invite `error` state is a message with a sticker and a link, as the mock shows, not `sh-error-state`. The rule that load failure uses `sh-error-state` does not apply, because nothing failed to load.
- The sign-in switch reads "Keep me signed in" in the mock; L2-003 calls it "Remember me". The mock wording is used.
- The profile-photo mocks draw the success and failed messages as `alert` blocks inside the dialog; they map to `sh-banner`. `ProfilePhotoDialog` lives in the `settings` library and the shell opens it for the reader.
- The mocks carry no requirement IDs, so none are listed here; see each feature's detailed design.

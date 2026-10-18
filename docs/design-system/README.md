# Shelfie design system

Extracted from [docs/mocks](../mocks/README.md) on 2026-10-17. Open [index.html](index.html) locally in Chrome. The mocks now load `tokens/tokens.css` and `assets/components.css` from here, so this folder is the single source of truth for how Shelfie looks.

## Foundations

| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Ramps, semantic roles, both themes, every contrast pair with live ratios |
| [Typography](foundations/typography.html) | Families, scale, weights, line heights, role shorthands, measure |
| [Spacing](foundations/spacing.html) | 4px scale, inside vs between |
| [Layout](foundations/layout.html) | Breakpoints, columns, gutters, margins, live grid, page templates |
| [Elevation](foundations/elevation.html) | Shadows, surfaces, z-order |
| [Shape](foundations/shape.html) | Radii, border widths, avatar and cover sizes |
| [Motion](foundations/motion.html) | Durations, easings, replayable demos, reduced motion |
| [Iconography](foundations/iconography.html) | Icon style, sizes, labelling, the 23 icons in the mocks |
| [Theming](foundations/theming.html) | data-theme, OS preference, token tiers, adding a theme, tokens.json |
| [Responsive](foundations/responsive.html) | Mobile-first rules per component, touch, testing matrix |
| [Accessibility](foundations/accessibility.html) | WCAG 2.2 AA commitments, target and control sizes, focus ring |
| [Content](foundations/content.html) | Voice, casing, verbs, dates, error and empty formulas, microcopy |

## Components

| Component | Group | Variants | States | Source mocks |
|---|---|---|---|---|
| [Button](components/button.html) | Actions | primary, secondary, ghost, danger; block; icon-only · sm/md/lg | default, hover, focus, active, disabled, busy | sign-in, log-chapter, manage-book, delete-book |
| [Link](components/link.html) | Actions | inline, standalone | default, hover, focus | sign-in, forgot-password, manage-book |
| [Menu](components/menu.html) | Actions | account menu (reader, grown-up) | closed, open, item hover/focus | account-menu, shelf |
| [Form field](components/form-field.html) | Inputs | label, optional, help, error | default, invalid | add-book, manage-book, settings, give-reward |
| [Text field](components/text-field.html) | Inputs | text, e-mail, password · sm/md/lg | default, hover, focus, disabled, read-only, invalid | sign-in, add-book, settings, log-chapter |
| [Combobox](components/combobox.html) | Inputs | catalogue matches (with cover), suggested matches (badge) | closed, searching, open with active row, row hover, no matches, lookup failed | add-book |
| [Textarea](components/textarea.html) | Inputs | answer, note | default, hover, focus, disabled, read-only, invalid | log-chapter, review-chapter, give-reward, edit-question |
| [Suggestion](components/suggestion.html) | Inputs | one row | not ticked, ticked, focus, invalid, disabled | suggest-questions |
| [Radio group](components/radio-group.html) | Inputs | vertical with description | default, hover, focus, checked, disabled, invalid | settings, edit-question, add-book |
| [Switch](components/switch.html) | Inputs | on/off with label | off, on, hover, focus, disabled | sign-in |
| [Form layout](components/form-layout.html) | Inputs | actions bar, error summary, danger zone | default, submitting, invalid | manage-book, settings, add-book, sign-in |
| [Swatch picker](components/swatch-picker.html) | Inputs | cover colour, cover sticker | default, hover, focus, checked | add-book, settings |
| [Sticker picker](components/sticker-picker.html) | Inputs | sticker choice | default, hover, focus, active, pressed, disabled, invalid | review-chapter, give-reward |
| [Top bar](components/top-bar.html) | Navigation | reader, grown-up | link hover, focus, current | shelf, book, add-book, review |
| [Tab bar](components/tab-bar.html) | Navigation | grown-up phone nav, with count | default, hover, focus, current | review, books, manage-book, settings |
| [Breadcrumb](components/breadcrumb.html) | Navigation | two and three levels | link hover, focus, current | add-book, book, chapter, log-chapter |
| [Skip link](components/skip-link.html) | Navigation | — | hidden, focused | shelf, review, sign-in |
| [Layout primitives](components/layout.html) | Containers and overlays | container, stack, cluster, grid, spans, page header, auth layout | — | review, review-chapter, add-book, shelf |
| [Card](components/card.html) | Containers and overlays | default, flush, success, warning | — | review, review-chapter, manage-book, book |
| [Hero](components/hero.html) | Containers and overlays | keep reading | — | shelf |
| [Accordion](components/accordion.html) | Containers and overlays | bordered, flush | closed, open, hover, focus | book |
| [Dialog](components/dialog.html) | Containers and overlays | default, destructive, form · sheet under 640px | default, busy, invalid, failed | give-reward, delete-book, edit-question |
| [List](components/list.html) | Data display | title + meta, with cover/avatar | — | review, books, manage-book |
| [Table](components/table.html) | Data display | in a card (flush) | row hover | manage-book, delete-book |
| [Activity feed](components/feed.html) | Data display | activity | — | review, give-reward |
| [Avatar](components/avatar.html) | Data display | rose, sky, sun, mint, lilac, sage, peach; photo; button · sm/md/lg/xl | hover, focus (button); photo loading, broken, uploading | shelf, review, sign-in, account-menu, settings, profile-photo |
| [Photo picker](components/photo-picker.html) | Input | no photo, with photo | focus, uploading, too large, wrong type | profile-photo |
| [Logo mark](components/logo-mark.html) | Identity | 64px tile | default | sign-in, sign-up, accept-invite, forgot-password, reset-password |
| [Badge](components/badge.html) | Data display | neutral, info, success, warning, count | — | books, manage-book, review, shelf |
| [Chip](components/chip.html) | Data display | toggle | default, hover, focus, pressed, disabled | log-chapter, give-reward |
| [Streak](components/streak.html) | Data display | pill | — | shelf, book, log-chapter, review |
| [Stat](components/stat.html) | Data display | label + value | — | review, give-reward |
| [Book cover](components/cover.html) | Data display | 7 colours · sm/md/lg/xl; picture; skeleton | picture loading, picture failed | shelf, book, books, add-book, manage-book |
| [Cover picker](components/cover-picker.html) | Input | no picture, with picture | focus, uploading, too large, wrong type | add-book, manage-book |
| [Book card](components/book-card.html) | Data display | reading, up next, finished | — | shelf, book, log-chapter, give-reward |
| [Chapter row](components/chapter-row.html) | Data display | done, next, future | default, hover, focus | book |
| [Sticker](components/sticker.html) | Data display | md, lg, xl | — | review, shelf, chapter, book |
| [Question and answer](components/question-answer.html) | Data display | answered, flagged (Dad only) | — | chapter, review-chapter, manage-book |
| [Feedback note](components/feedback-note.html) | Data display | sticker + note | — | chapter, review-chapter |
| [Trophy](components/trophy.html) | Data display | reward given, waiting | — | shelf, banner |
| [Toast](components/toast.html) | Feedback | info, success, warning, danger; with action; stacked | entering, timed, leaving | toast |
| [Alert and banner](components/alert.html) | Feedback | info, success, warning, danger; banner; dismissible | — | banner, sign-in, add-book, settings, review-chapter |
| [Inline message](components/inline-message.html) | Feedback | field error, saving, saved | — | add-book, log-chapter, sign-in, settings |
| [Progress](components/progress.html) | Feedback | default, large, complete; with label | — | shelf, book, log-chapter, manage-book |
| [Skeleton](components/skeleton.html) | Feedback | text, title, rect, cover | loading | shelf, book, chapter, log-chapter |
| [Empty state](components/empty-state.html) | Feedback | first-run, error | — | shelf, books, review, book |
| [Error page](components/error-page.html) | Feedback | 404, 403, 500, offline | — | not-found, forbidden, server-error, offline |
| [Celebration](components/celebration.html) | Feedback | chapter logged, book finished | playing, reduced motion | log-chapter, review-chapter, book |

### Left out on purpose

AGENTS.md locks scope to what the mocks define, so components a generic kit would include but Shelfie never uses are **not** in this system: checkbox, select, switch, tabs, tooltip, sidebar navigation, pagination, stepper, drawer, popover, button group, spinner, description list, link-style button, interactive card, input groups and search. Their CSS was removed from the mocks' starter kit during extraction. Add one only when a mock needs it.

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | Labels, validation timing, error summary, busy submit, drafts, destructive confirmation |
| [Feedback and loading](patterns/feedback-and-loading.html) | Inline vs toast vs banner vs dialog; skeletons; busy buttons |
| [Empty and error states](patterns/empty-and-error-states.html) | First-run, load failures, error pages; copy formulas |
| [Navigation and page structure](patterns/navigation.html) | Reader and grown-up shells, page header, breadcrumbs, back |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | Dialog vs menu vs page; bottom sheets |
| [Lists and tables](patterns/lists-and-tables.html) | Chapter lists, book lists, chapters table, long lists |
| [Notifications](patterns/notifications.html) | Toast vs banner, priority, auto-dismiss, stacking |
| [Content and tone](patterns/content-and-tone.html) | Warm for Nia, plain for Dad; microcopy library |

## Tokens

- `tokens/tokens.css` — source of truth: primitives, semantic tokens, component sizes; light on `:root` and `[data-theme="light"]`, dark on `[data-theme="dark"]` and under `prefers-color-scheme: dark`; reduced-motion, more-contrast and forced-colours overrides.
- `tokens/tokens.json` — DTCG export generated from `tokens.css` (dark values under `$extensions`). Regenerate, never hand-edit.
- `tokens/contrast-pairs.json` — every foreground/background pairing the components rely on: 82 pairs, 158 checks across both themes.
- `assets/components.css` — the product stylesheet; `assets/ds.css` and `assets/ds.js` — documentation-site chrome only.

## Drift found in the mocks

| # | Mock | Issue | Resolution |
|---|---|---|---|
| D1 | `assets/tokens.css` (dark theme) | Six raw hex values bypassed the palette | New primitives `--palette-gray-150/350/450/475/750/925` |
| D2 | `notifications/toast/*` (dark) | Status icons on the pale inverse toast surface measured 1.4–1.8:1, effectively invisible | New `--color-{info,success,warning,danger}-icon-on-inverse`; ≥ 3:1 in both themes |
| D3 | `assets/ui.css` | Looping animations used raw 0.8 s / 1.4 s / 1.6 s | `--duration-loop` (1400 ms); spinner = loop ÷ 2; pulse 1.6 s → 1.4 s |
| D4 | `assets/ui.css` | Off-grid sizes: 22px badge, 6px dot, 10.4px bar, 9.6×14.4px confetti, 1.1em spinner, `2px 2px 0 0` radius | Snapped to 24px (`--target-min`), 8px, 8×12px, 1.25em; radius tokens |
| D5 | `assets/ui.css` + 16 mocks | Desktop-first `max-width: 39.99/47.99/63.99rem` queries; 16 mocks patch grid spans with inline `<style>` and `!important` | Mobile-first `min-width` only; `.span-4/5/7/8` (full width until 1024px) and `.sticky-aside` |
| D6 | 58 mocks (top bar) | `<button class="avatar">` reset inline | `button.avatar` rule with a hover ring |
| D7 | log-chapter/finished, book/finished, manage-book/rewarded | Tinted celebration cards via inline gradients | `.card--success`, `.card--warning` |
| D8 | Most content pages | Card headings styled inline (`font: var(--text-h4)`, padding) | `.card__title` |
| D9 | manage-book, dialogs over it | `.table-wrap` reset inline inside a card; long cells capped inline | `.table-wrap--flush`; `.table td.truncate` |
| D10 | book/edge | `.accordion` restyled inline as a divider | `.accordion--flush` |
| D11 | 8 invalid-state mocks | Error-summary list indented with `1.2em` inline | `.form-summary ol` uses `--space-5` |
| D12 | `assets/ui.css` | `1px`/`2px` borders as raw values | `--border-width-hairline` / `--border-width-thick` |
| D13 | `assets/ui.css` | Raw icon, avatar, cover and sticker sizes | `--size-icon-*`, `--size-avatar-*`, `--size-cover-*` (small-cover sticker 20px → 17.6px) |
| D14 | `assets/ui.css` | Starter-kit components no mock uses | Removed (scope lock, see above) |
| D15 | `assets/ui.css` | Menu items showed keyboard focus only as a faint fill | Shared focus ring, inset |
| D16 | `assets/ui.css` | Toasts on phones sat on top of the grown-up's fixed tab bar | Region lifted above the tab bar while it shows (`body:has(.tabbar)`) |
| D17 | log-chapter/success, finished | Confetti looped forever; the mock note says it runs 2.5 s then stops | One pass with `animation-fill-mode: both` |
| D18 | `README.md` cast | "Today: Friday 17 October 2026" — 17 October 2026 is a Saturday | Not changed in the mocks; the story date needs a decision |
| D19 | `assets/ui.css` | `.table-wrap` scrolled its table, but the table's visually-hidden `<caption>` (absolutely positioned) escaped the scroll box and widened the whole page on phones | `.table-wrap { position: relative }` so the caption is clipped with the table |
| D20 | `assets/ui.css` | Sticker-choice emoji at 1.75rem (28px), off the type scale | `--font-size-3xl` (30px); the picker grows by 2px per row |
| D21 | `assets/ui.css` | Radio inputs, accent bubbles and similar raw `1.25rem`/`0.5rem` literals | `--size-icon-md`, `--space-2` |
| D22 | auth mocks (logo) | The 📖 emoji inside a round sticker sat off-centre: emoji glyph metrics are not symmetric | `.logo-mark` shows the app icon as its own tile, centred by grid (new component page) |
| D23 | sign-in, sign-up, accept-invite (first draft) | Help text under nearly every field, a two-line switch explanation, multi-sentence alerts | Help only for the username rule and password minimum; one-line switch label; alert = title + one sentence (see Content foundation, "less is more") |
| D24 | sign-in (first draft) | PIN keypad and profile picker for the reader | Retired with the new accounts model: `.pin-dots`, `.pinpad`, `.profiles`, `.profile-tile` removed, pages `pin-entry` and `profile-tile` deleted |

### Open issues in the mocks (not fixed by this extraction)

- **Books list at 360 px** (`pages/books/default`): the row puts cover, title, status badge and a Manage button side by side, so the title wraps into a column about 65 px wide ("The / Lion, / the / Witch…"). Snapping the badge to 24 px high and its dot to 8 px made it a little worse. Stack the badge and button under the title below 640 px.

### Still in the mocks (not changed by this extraction)

The mocks were pointed at this system but their HTML was not rewritten, so the inline workarounds behind D5–D11 still sit in the mock pages and keep working. When a page is next edited, replace them with the classes above. Component pages also record mock-level content issues: every answer box on log-chapter is `required` although only question 1 should be; the add-question radios have no `value`; the chapters table repeats bare "Open" links; the streak's `aria-label` sits on a plain `<span>`; the danger toast nests `role="alert"` inside a `role="status"` region.

## Changelog

### 2026-10-18: suggested questions

- **Added:** [Suggestion](components/suggestion.html) (`.suggestions`, `.suggestion`, `.suggestion__check`): a suggested question with a keep tick and editable wording, for the Suggested questions dialog.
### 2026-10-18: book autocomplete

- **Added:** [Combobox](components/combobox.html) (`.combobox`, `.combobox__panel`, `.combobox__list`, `.combobox__option`, `.combobox__text`, `.combobox__title`, `.combobox__detail`, `.combobox__note`): the Title field on Add a book with its dropped list of matches, the Suggested badge on AI rows and the searching, no-match and lookup-failed notes.
- **Tokens:** none added or changed.

### 2026-10-18: book cover pictures

- **Added:** [Cover picker](components/cover-picker.html) (`.cover-picker__actions`) and the picture variant of [Book cover](components/cover.html) (`img.cover__img` over the colour and sticker, with picture-loading and picture-failed states). Sample covers in `assets/covers/`.
- **Changed:** Book cover overview, anatomy, variants, states, accessibility, motion, content, code and sources.
- **Tokens:** none added or changed.

### 2026-10-18: profile photos

- **Added:** [Photo picker](components/photo-picker.html) (`.photo-picker`), the photo variant of [Avatar](components/avatar.html) (`img.avatar__img` over the initial, loading, broken and uploading states) and the extra-large avatar size (`.avatar--xl`, already tokenised as `--size-avatar-xl`). Sample photos in `assets/photos/`.
- **Changed:** Avatar overview, accessibility, content, do/don't, tokens, code and sources.
- **Tokens:** none added or changed.

### 2026-10-18: accounts and profiles

- **Added:** [Switch](components/switch.html) (Keep me signed in), [Logo mark](components/logo-mark.html) (the app icon as a centred tile), the "with trailing button" variant of [Text field](components/text-field.html) (show/hide password), avatar colours sun, mint, lilac, sage and peach, and the "Auth page effects" section of [Motion](foundations/motion.html#auth-effects): card entrance, field stagger, logo sway and the WebGPU aurora with its CSS fallback (`assets/aurora.js`, `assets/logo.png`).
- **Removed:** PIN entry and Profile tile (pages, CSS, nav, index, README rows). Every PIN, profile-picker and "Switch reader" example, caption and mock link in the remaining pages.
- **Changed:** [Menu](components/menu.html) (no Switch reader; username in the header), [Error page](components/error-page.html) (Grown-ups only offers Sign out), [Layout](components/layout.html) (auth card with logo and aurora), [Forms](patterns/forms.html) and [Content](foundations/content.html) (shorter copy rules), sign-in sources now point at the single sign-in mock.
- **Tokens:** none added or changed.


## Verification

Run on 2026-10-18 from the repository root, after the accounts-and-profiles update.

| Check | Command | Result |
|---|---|---|
| Mocks structure | `python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks` | 27 screens, 119 mocks, 0 errors, 0 warnings |
| Contrast, both themes | `python3 .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css` | 158 passed, 0 failed, 0 unresolved |
| Token export | `tokens_to_json.py docs/design-system/tokens/tokens.css` | 302 tokens written to `tokens/tokens.json` |
| Structure | `python3 .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 65 pages (12 foundations, 44 components, 8 patterns, index), 0 errors, 0 warnings (PIN entry and Profile tile out, Switch and Logo mark in) |
| Token coverage | script over `tokens.css` | All 245 custom properties appear in a `data-token` cell on exactly one foundation page |
| Layout and live values | headless Chrome over all 65 pages at 360 px (light, dark) and 1280 px (dark) | No horizontal page scroll, no failing live contrast ratio, no empty token cell, no script error |
| Screenshots | `screenshot_mocks.py` at 360×800 and 1280×800, both themes | 256 design-system and 404 mock shots captured. Looked at by eye: the colour, button, toast and dialog pages, and three changed mocks (books, review chapter, toast with action). The other pages were covered by the automated layout audit only |
| Mocks before vs after | pixel diff of the 404 mock shots | 312 differ. Static differences are the token snaps (D4, D13, D20), the toast lift (D16) and the tab-bar state; the rest are animated states captured at different phases |

Not verified by tooling: a screen-reader pass, 200 % and 400 % zoom, and `forced-colors` rendering. The accessibility foundation page lists them as the manual checks to run when the components exist in Angular.

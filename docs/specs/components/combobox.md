# Combobox

| Field | Value |
|---|---|
| Selector | `sh-combobox` |
| Library path | `apps/web/projects/components/src/lib/combobox/` |
| Status | built |
| Traces to | L2-025, L2-026, L2-028, L2-074, L2-075, L2-077, L2-078, L2-079 |
| Design system | [`combobox.html`](../../design-system/components/combobox.html) |
| Source mocks | [`pages/add-book/suggestions`](../../mocks/pages/add-book/suggestions.html), [`pages/add-book/suggestions-ai`](../../mocks/pages/add-book/suggestions-ai.html), [`pages/add-book/searching`](../../mocks/pages/add-book/searching.html), [`pages/add-book/no-matches`](../../mocks/pages/add-book/no-matches.html), [`pages/add-book/lookup-failed`](../../mocks/pages/add-book/lookup-failed.html), [`pages/add-book/picked`](../../mocks/pages/add-book/picked.html) |
| Rendering | [`combobox.html`](combobox.html) |

## Purpose and scope

The combobox is the text field that looks things up as Nia or Dad types and drops the matches down as a list to pick from. Shelfie uses it for the Title on Add a book: three letters and a pause bring up to five books, each with its cover, title and author; picking one lets the page fill in the author, the chapter count and the cover picture. It is a [text field](../../design-system/components/text-field.html) first: what is typed is the value whether or not anything is picked, and the field keeps working when the list is empty or the lookup is off.

Use a [menu](../../design-system/components/menu.html) for actions and a [radio group](../../design-system/components/radio-group.html) for a few known options. The combobox is for free text with help.

Out of scope:

- Deciding when to search, what to search and what a pick fills in. The page owns the debounce, the request, the stale-request handling and the fill; the combobox renders what it is given and reports the pick (L2-074, L2-075).
- Fetching or storing covers. A row shows the `image` URL it is given; the page's [cover picker](../../design-system/components/cover-picker.html) and [book cover](../../design-system/components/cover.html) handle the chosen picture.
- Multi-select, chips, free-text "create" rows and grouping.

## Usage

| Where | Configuration | Slots / content | States seen | Surface |
|---|---|---|---|---|
| `pages/add-book/suggestions` Title | `label` "Title", `size` lg, `maxlength` 120, 3 catalogue options (one with a cover) | option titles and authors | open, first row active, row with placeholder cover | card |
| `pages/add-book/suggestions-ai` Title | 3 options with `suggested: true`, `note` "Not in the book catalogue, so these are guesses. Check them before you add the book." | "Dragon Rider", "Cornelia Funke · 56 chapters" | open with badges and note | card |
| `pages/add-book/searching` Title | `status` `'searching'`, no options | "Looking that up…" | searching | card |
| `pages/add-book/no-matches` Title | `status` `'empty'`, no options | "No matches. Keep typing, or fill the rest in yourself." | empty | card |
| `pages/add-book/lookup-failed` Title | `status` `'failed'`, no options | "Shelfie couldn’t look that up. You can still fill it in yourself." | failed | card |
| `pages/add-book/picked`, `default`, `invalid`, `submitting`, `error` Title | `status` `'idle'`, no options; `error` "The book needs a title." (invalid); `readonly` (submitting) | — | closed, invalid, read-only | card |

Every row is buildable with the API below.

## Anatomy

1. **Field** — `.field.combobox`. The text field's wrapper, `position: relative`, so the panel hangs from it.
2. **Label** — `.field__label` with `for` the input id. Always visible.
3. **Input** — `input.input` (`.input--lg` when `size` is lg) with `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `autocomplete="off"`, `maxlength`, `aria-invalid` and `aria-describedby` as the text field sets them.
4. **Panel** — `.combobox__panel`. Absolutely positioned under the input, as wide as it, on `--z-dropdown`, `--shadow-3`. Present only while the list or a note shows.
5. **Note** — `p.combobox__note`. The searching (`aria-busy="true"`, spinner), empty and failed messages (`role="status"`), or the plain note above suggested rows.
6. **List** — `ul.combobox__list` with `role="listbox"` and `aria-label="Matching books"`.
7. **Option** — `li.combobox__option` with `role="option"`, an id, `aria-selected`; holds a `sh-cover` sm (`image` or the 📖 placeholder on sage), `.combobox__text` with `.combobox__title` and `.combobox__detail`, and `span.badge.badge--info` "Suggested" when `suggested`.
8. **Error** — `.field__error`, from the text field, under the panel's anchor.
9. **Status** — `p.visually-hidden[role=status]`: the count announcement and the pick announcement.

Host: `sh-combobox` is `display: block`; the classes go on the inner elements, so the page objects find `.combobox__option` and the ARIA attributes exactly as in the mocks.

## API

### Inputs

| Input | Type | Default | Required | Rule |
|---|---|---|---|---|
| `label` | `string` | — | yes | The visible label and the input's accessible name. |
| `value` | `string` (model) | `''` | no | Two-way; the typed text. Set by the owner on a pick. |
| `size` | `'md' \| 'lg'` | `'md'` | no | `lg` adds `.input--lg`. |
| `maxlength` | `number \| null` | `null` | no | Native `maxlength`. |
| `error` | `string \| null` | `null` | no | The text field's error line and `aria-invalid`. |
| `readonly` | `boolean` | `false` | no | Native `readonly`; the list cannot open. |
| `autofocus` | `boolean` | `false` | no | As on the text field. |
| `options` | `ComboboxOption[]` | `[]` | no | The rows, in order; the first five are rendered. `{ id: string; title: string; detail: string; image: string \| null; suggested: boolean }`. |
| `status` | `'idle' \| 'searching' \| 'empty' \| 'failed'` | `'idle'` | no | Which note shows while `options` is empty. Ignored when there are options. |
| `note` | `string \| null` | `null` | no | A line shown above the rows (the "these are guesses" note). |

### Outputs

| Output | Payload | Emitted when |
|---|---|---|
| `picked` | `ComboboxOption` | A row is clicked, tapped or confirmed with Enter. The component closes the list first. |
| `valueChange` | `string` | Every keystroke (the model's own output). |

### Content slots

| Slot | Accepts | Rule |
|---|---|---|
| None | | Everything comes through inputs so the page objects, the mocks and the component agree on the DOM. |

## Variants and sizes

| Variant | Modifier | Use for |
|---|---|---|
| Catalogue row | — | A match with `suggested: false`; shows `image` when set, else the 📖 placeholder; detail is the author. |
| Suggested row | `.badge.badge--info` after the text | A match with `suggested: true`; never has an image; detail is "Author · N chapters". |

| Size | Modifier | Height | Padding | Type |
|---|---|---|---|---|
| md | — | `--control-height-md` | `--space-3` | `--text-body` |
| lg | `.input--lg` | `--control-height-lg` | `--space-3` | `--font-size-lg` |

The panel has one size: the input's width, rows at least `--target-comfortable` tall, at most five rows.

## States

| State | Trigger | Visual | Assistive technology |
|---|---|---|---|
| Closed | `options` empty and `status` `'idle'`, or after Escape, a pick, or focus leaving | Plain text field | `aria-expanded="false"`, no `aria-activedescendant` |
| Searching | `status` `'searching'` | Panel with spinner and "Looking that up…" | Note `role="status" aria-busy="true"`; `aria-expanded="false"` |
| Open | `options` non-empty and the field focused (or reopened with ArrowDown) | Panel with the rows; first row active | `aria-expanded="true"`, `aria-controls` the list, `aria-activedescendant` the active row, status "N matches. Use the up and down arrows to pick one, or keep typing." |
| Active row | ArrowUp/ArrowDown | `--color-accent-subtle` fill and the focus ring inset | `aria-selected="true"` on that row only |
| Row hover | `:hover` | `--color-bg-subtle` fill | — |
| Suggested | `option.suggested` | Badge "Suggested"; `note` above the rows | Status says "N suggestions…" |
| Empty | `status` `'empty'` | Panel with "No matches. Keep typing, or fill the rest in yourself." | Note `role="status"` |
| Failed | `status` `'failed'` | Panel with "Shelfie couldn’t look that up. You can still fill it in yourself." | Note `role="status"` |
| Invalid | `error` set | Text field invalid border and `.field__error` | `aria-invalid="true"`, `aria-describedby` the error |
| Read-only | `readonly` | Sunken field | List never opens |

## Markup

```html
<!-- rendered: open, first row active, one catalogue row with a cover and one suggested row -->
<div class="field combobox">
  <label class="field__label" for="sh-combobox-0">Title</label>
  <input class="input input--lg" id="sh-combobox-0" type="text" value="Winn" maxlength="120" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="sh-combobox-0-list" aria-activedescendant="sh-combobox-0-opt-0" autocomplete="off">
  <div class="combobox__panel">
    <ul class="combobox__list" id="sh-combobox-0-list" role="listbox" aria-label="Matching books">
      <li class="combobox__option" id="sh-combobox-0-opt-0" role="option" aria-selected="true">
        <span class="cover cover--sm cover--sage" aria-hidden="true">📖<img class="cover__img" src="/api/books/search/covers/8739161" alt=""></span>
        <span class="combobox__text"><span class="combobox__title">Because of Winn-Dixie</span><span class="combobox__detail">Kate DiCamillo</span></span>
      </li>
      <li class="combobox__option" id="sh-combobox-0-opt-1" role="option" aria-selected="false">
        <span class="cover cover--sm cover--sage" aria-hidden="true">📖</span>
        <span class="combobox__text"><span class="combobox__title">Dragon Rider</span><span class="combobox__detail">Cornelia Funke · 56 chapters</span></span>
        <span class="badge badge--info">Suggested</span>
      </li>
    </ul>
  </div>
  <p class="visually-hidden" role="status">2 matches. Use the up and down arrows to pick one, or keep typing.</p>
</div>
```

```html
<!-- rendered: searching (empty and failed differ only in the text and the absence of aria-busy) -->
<div class="combobox__panel"><p class="combobox__note" role="status" aria-busy="true">Looking that up…</p></div>
```

```html
<!-- consumer -->
<sh-combobox label="Title" size="lg" [maxlength]="120" [error]="titleError()" [(value)]="title"
             [options]="matches()" [status]="lookup()" [note]="suggestedNote()" (picked)="fillFrom($event)" />
```

## Design

- Input: the text field's tokens (`--field-bg`, `--field-border`, `--radius-md`, `--control-height-md` / `-lg`).
- Panel: `--color-bg-surface-raised`, hairline `--color-border-default`, `--radius-md`, `--shadow-3`, `--space-1` margin and padding, `--z-dropdown`; enters with `scale-in` over `--duration-fast` `--ease-enter`, none under reduced motion.
- Row: `--space-2` by `--space-3` padding, `--space-3` gap, `--radius-sm`, `--target-comfortable` minimum height; the cover is the `sm` book cover (`--size-cover-sm`).
- Text: title `--text-label` in `--color-fg-default`; detail `--text-body-sm` in `--color-fg-muted`; note `--text-body-sm` in `--color-fg-muted`.
- Spinner: `1em`, `--border-width-thick` of `currentColor`, `spin` over half `--duration-loop`.

Component tokens:

| Token | Aliases | Overridden by |
|---|---|---|
| `--field-bg`, `--field-border` | `--color-bg-surface`, `--color-border-strong` (text field) | Hover, focus, invalid, read-only as the text field does |

The combobox declares no tokens of its own; its parts reuse the text field, cover and badge tokens.

## Colour

| Part | Token | Light | Dark |
|---|---|---|---|
| Panel surface | `--color-bg-surface-raised` | `--palette-white` | `--palette-gray-800` |
| Active row fill | `--color-accent-subtle` | `--palette-violet-50` | `--palette-violet-950` |
| Active row ring | `--color-focus-ring` | `--palette-violet-500` | `--palette-violet-400` |
| Hovered row | `--color-bg-subtle` | `--palette-gray-100` | `--palette-gray-800` |
| Title | `--color-fg-default` | `--palette-gray-900` | `--palette-gray-50` |
| Detail and note | `--color-fg-muted` | `--palette-gray-600` | `--palette-gray-400` |
| Badge | `--color-info-fg` on `--color-info-bg` | as the badge | as the badge |

| Foreground | Background | Minimum | Use |
|---|---|---|---|
| `--color-fg-default` | `--color-bg-surface-raised` | 4.5:1 | Title on the panel |
| `--color-fg-muted` | `--color-bg-surface-raised` | 4.5:1 | Detail and notes |
| `--color-fg-default` | `--color-accent-subtle` | 4.5:1 | Title on the active row |
| `--color-fg-muted` | `--color-accent-subtle` | 4.5:1 | Detail on the active row |
| `--color-focus-ring` | `--color-bg-surface-raised` | 3:1 | Active-row ring |

## Responsive behaviour

- The panel is as wide as the input at every width; at XS the input spans the card, so the panel spans the card.
- Rows wrap (`flex-wrap`): the text column is `flex: 1 1 12rem`, so under about 20 rem of row width the badge drops to its own line, right-aligned. Titles wrap with `overflow-wrap: anywhere`; nothing truncates.
- The panel overlays the field below it rather than pushing the form down, at every breakpoint.
- At 320 px nothing scrolls horizontally or clips; at 200 % zoom everything stays available; every row is at least 44 × 44 CSS px on touch devices.

## Accessibility

### Role and pattern

A native `<input type="text">` with `role="combobox"`, following the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) with list autocomplete and manual selection. The popup is a `role="listbox"` of `role="option"` rows. Focus stays in the input throughout; the active row is conveyed by `aria-activedescendant`.

### Keyboard

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | Closes the list without picking and moves on. |
| Typing | Edits the value; the owner decides when the list opens. |
| <kbd>↓</kbd> | Moves the active row down, wrapping to the first; on a closed list with options, opens it on the first row. |
| <kbd>↑</kbd> | Moves the active row up, wrapping to the last. |
| <kbd>Enter</kbd> | Open list: picks the active row and prevents form submission. Closed list: default (submits the form). |
| <kbd>Escape</kbd> | Closes the list; the value and focus stay. |

### Focus

Focus never moves into the panel. The input shows the text field's focus ring; the active row shows an inset ring of `--color-focus-ring` on `--color-accent-subtle`. After a pick the owner moves focus (Add a book sends it to Chapters when the match has no chapter count).

### Labelling

The label names the input. The listbox is named "Matching books". Each option's accessible name is its title followed by its detail and, for suggested rows, "Suggested". `aria-expanded` is true only while rows show; `aria-controls` always names the list id; `aria-activedescendant` is removed when the list closes.

### Announcements

One visually hidden `role="status"` (polite) says, when the list opens, "N matches. Use the up and down arrows to pick one, or keep typing." or "N suggestions. Use the up and down arrows to pick one, or keep typing."; after a pick, "Filled in from the match. Check the chapters." The searching, empty and failed notes are themselves `role="status"`.

### Motion

The panel scales in over `--duration-fast`; `prefers-reduced-motion: reduce` removes the animation. The spinner turns continuously and is `aria-hidden` by being a pseudo-element.

## Content and internationalisation

- Option text is data (title, author, chapter count) shown as text; the detail joins author and chapter count with " · ", and reads "Unknown author" when the author is null.
- Fixed copy lives in the component: "Matching books", "Looking that up…", "No matches. Keep typing, or fill the rest in yourself.", "Shelfie couldn’t look that up. You can still fill it in yourself.", "Suggested", "N matches/suggestions. Use the up and down arrows to pick one, or keep typing.", "Filled in from the match. Check the chapters." Shelfie ships in English only; these strings are the component's and change in one place.
- Translatable inputs: `label`, `error`, `note`. Data values: `options[].title`, `options[].detail`.
- Long titles ("Because of Winn-Dixie: Read-Along Edition") wrap onto two lines at 360 px.

## Performance

- Change detection: `OnPush`, signal inputs, `computed` for the rendered rows and the status text.
- No perf-test project exists in this repository; the component renders at most five rows and one image per row, and does no work on keystrokes beyond updating the model.
- Layout stability: the panel is absolutely positioned, so opening, changing or closing the list never moves the form below it. Covers reserve their `sm` size before the image loads.
- Weight: imports only `sh-cover` from the library; no CDK, no overlay container.

## Acceptance criteria

### Rendering

- **AC-1** Given the Title combobox with three catalogue options, when it renders open, then the panel shows three `.combobox__option` rows in order, each with an `sh-cover` sm, a `.combobox__title` and a `.combobox__detail`, and the row whose option has an `image` shows it over the 📖 placeholder. (L2-074)
- **AC-2** Given seven options, when the list renders, then only the first five rows show. (L2-074)
- **AC-3** Given an option whose title is `<b>Matilda</b>`, when the row renders, then the text "<b>Matilda</b>" is visible and no `b` element exists inside the row. (L2-028)
- **AC-4** Given an option with `suggested: true`, when the row renders, then it carries a `.badge` reading "Suggested" and no `img`, and the `note` renders in a `.combobox__note` above the list. (L2-077)

### States

- **AC-5** Given `status` `'searching'` and no options, when it renders, then a `.combobox__note[role=status][aria-busy=true]` reads "Looking that up…" and `aria-expanded` is "false". (L2-074)
- **AC-6** Given `status` `'empty'` and no options, when it renders, then a `role="status"` note reads "No matches. Keep typing, or fill the rest in yourself." (L2-074)
- **AC-7** Given `status` `'failed'` and no options, when it renders, then a `role="status"` note reads "Shelfie couldn’t look that up. You can still fill it in yourself." (L2-079)
- **AC-8** Given `status` `'idle'` and no options, when it renders, then there is no panel and the field is an ordinary text field. (L2-074)
- **AC-9** Given `error` "The book needs a title.", when it renders, then the input has `aria-invalid="true"` and is described by a `.field__error` with that text. (L2-075)

### Keyboard and focus

- **AC-10** Given the list open with "Because of Winn-Dixie" first, when ArrowDown is pressed twice and ArrowUp once, then the second row is active, has `aria-selected="true"`, and `aria-activedescendant` is its id while focus stays in the input. (L2-078)
- **AC-11** Given the list open on the last row, when ArrowDown is pressed, then the first row becomes active. (L2-078)
- **AC-12** Given the list open, when Enter is pressed, then `picked` emits the active option, the list closes and the surrounding form is not submitted. (L2-078)
- **AC-13** Given the list open, when Escape is pressed, then the list closes, the input still holds "Winn" and keeps focus. (L2-078)
- **AC-14** Given the list open, when Tab is pressed, then the list closes, nothing is picked and focus moves to the next field. (L2-078)
- **AC-15** Given the list closed with options still set, when ArrowDown is pressed, then the list opens with the first row active. (L2-078)
- **AC-16** Given the list open, when a row is clicked, then `picked` emits that option and the list closes. (L2-075)

### Screen readers

- **AC-17** Given the field, when it renders, then the input has `role="combobox"`, `aria-autocomplete="list"`, `autocomplete="off"`, `aria-controls` naming the listbox and `aria-expanded` matching whether rows show. (L2-078)
- **AC-18** Given three catalogue options, when the list opens, then the listbox is named "Matching books" and the polite status reads "3 matches. Use the up and down arrows to pick one, or keep typing." (L2-078)
- **AC-19** Given two suggested options, when the list opens, then the status reads "2 suggestions. Use the up and down arrows to pick one, or keep typing." and each row's accessible name ends with "Suggested". (L2-077)
- **AC-20** Given the list open, when a row is picked, then the status reads "Filled in from the match. Check the chapters." (L2-078)
- **AC-21** Given Add a book with the list open, when axe runs, then it reports no serious or critical violations. (L2-026)

### Theming

- **AC-22** Given the list open in the light theme and in the dark theme, when measured, then title on the panel, detail on the panel and title on the active row each reach 4.5:1 and the active-row ring reaches 3:1 against the panel. (L2-026)

### Responsive

- **AC-23** Given the Title field at 360 px with "Because of Winn-Dixie: Read-Along Edition" in the list, when it renders, then the panel is as wide as the input, the title wraps, no row is under 44 px tall and the page does not scroll sideways. (L2-025)
- **AC-24** Given a suggested row at 360 px, when it renders, then the Suggested badge sits on its own line under the text and nothing is clipped. (L2-025)

### Motion

- **AC-25** Given `prefers-reduced-motion: reduce`, when the list opens, then the panel has no animation. (L2-026)

### Performance

- **AC-26** Given the list opens, changes from three rows to a note, and closes, when the Author field's position is measured each time, then it does not move. (L2-074)

## Implementation notes

- Folder `apps/web/projects/components/src/lib/combobox/` with `combobox.ts`, `combobox.html`, `combobox.css`; `export interface ComboboxOption` beside the class; exported from `public-api.ts`.
- Composes `Cover` (`sh-cover`, `size="sm"`, `color="sage"`, `sticker="📖"`, `[image]`). The badge is the global `.badge.badge--info` class.
- The listbox rows are `li` elements with `(mousedown)` prevented so the input keeps focus, and `(click)` to pick; the active index is a signal reset to 0 whenever `options` changes.
- The input markup repeats the text field's (`.field`, `.field__label`, `.input`, `.field__error`, `aria-describedby`) rather than wrapping `sh-text-field`, because the combobox needs attributes on the `input` that the text field does not expose.
- Ids come from a module counter (`sh-combobox-N`, `-list`, `-opt-i`), as the text field does.

## Decisions

- **D-1** *Does the combobox search, or does the page?* The page. The mocks and L2-074 put the debounce, the 3-character threshold and the stale-request rule in the page's hands, and the component stays a pure renderer that any later lookup can reuse.
- **D-2** *Where does focus go after a pick?* It stays in the input; the owner may move it. L2-075 sends it to Chapters only when the match has no chapter count, which the component cannot know.
- **D-3** *Is the searching note a listbox state?* No: while searching there are no options, so `aria-expanded` is false and the note is a plain status. A listbox with no options would be announced as an empty list.
- **D-4** *Wrap `sh-text-field` or repeat its markup?* Repeat it. The text field exposes no way to set `role`, `aria-expanded`, `aria-controls` or `aria-activedescendant` on its input, and widening its API for one consumer would cost every other consumer a review.
- **D-5** *How many rows at most?* Five, enforced by the component as well as by the API (L2-074), so a later caller cannot drop a long list on a phone.
- **D-6** *The placeholder cover.* Sage with 📖, because the mocks draw it so and the colour and sticker are not the book's; the book's own colour and sticker come from the form.

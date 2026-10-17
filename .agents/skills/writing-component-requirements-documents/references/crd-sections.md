# CRD sections

Every CRD Markdown file has these headings, in this order, spelled exactly as
shown. `check_crds.py` looks for them. A section that does not apply stays,
with one sentence saying why ("The divider has no states; it is not
interactive.").

```
# <Component name>
(metadata table)
## Purpose and scope
## Usage
## Anatomy
## API
## Variants and sizes
## States
## Markup
## Design
## Colour
## Responsive behaviour
## Accessibility
## Content and internationalisation
## Performance
## Acceptance criteria
## Implementation notes
## Decisions
```

## Contents

- [Metadata table](#metadata-table)
- [Purpose and scope](#purpose-and-scope)
- [Usage](#usage)
- [Anatomy](#anatomy)
- [API](#api)
- [Variants and sizes](#variants-and-sizes)
- [States](#states)
- [Markup](#markup)
- [Design](#design)
- [Colour](#colour)
- [Responsive behaviour](#responsive-behaviour)
- [Accessibility](#accessibility)
- [Content and internationalisation](#content-and-internationalisation)
- [Performance](#performance)
- [Acceptance criteria](#acceptance-criteria)
- [Implementation notes](#implementation-notes)
- [Decisions](#decisions)

---

## Metadata table

Directly under the title, before any heading:

| Field | Value |
|---|---|
| Selector | `sh-button` (list every selector the component owns: `sh-button`, `sh-button-link`, `sh-button-anchor`) |
| Library path | `frontend/projects/components/src/lib/button/` |
| Status | `built` or `planned` |
| Traces to | L2-096, L2-100, L2-101, L2-103, L2-104, L2-108 |
| Design system | [`button.html`](../../design-system/components/button.html) |
| Source mocks | [`pages/discover/default`](../../mocks/pages/discover/default.html), … |
| Rendering | [`button.html`](button.html) |

The *Traces to* row is the union of every L2 ID cited in the acceptance
criteria, sorted. It is never empty.

## Purpose and scope

Two short paragraphs: what the component is for, in the product's words, and
when to use something else instead (link the sibling CRDs). Then a bullet list
of what is **out of scope** — behaviour that belongs to the page or a parent
component, not here. Scope lines prevent the classic failure where a button CRD
grows rules about form validation.

## Usage

The usage inventory is the proof that the API is complete. List **every** place
the product uses the component: each page, dialog and notification in
`docs/mocks/` (search for the block class), not just the design-system page's
*Sources*. Give one row per distinct configuration:

| Where | Configuration | Slots / content | States seen | Surface |
|---|---|---|---|---|
| `pages/discover/default` search bar | primary, lg, block below SM, submit | label "Find a sweet hand" | default, busy "Finding makers near you…" | light island on stage |
| `pages/maker/default` header | secondary, toggle | heart icon + "Saved" / "Save" | pressed true/false | stage |
| `dialogs/cancel-pre-order/default` | danger | "Cancel pre-order" | default, busy "Cancelling…" | dialog surface |

Every row must be buildable with the API below. If one is not, extend the API
before going on. A gap found here costs one edit; a gap found after the
component ships costs a change to every consumer. Group screens that use the
same configuration ("every dialog footer: primary + secondary").

## Anatomy

A numbered list of the parts, each with its BEM class and one line of rules.
The class names are copied from the design-system page and `components.css`,
because the e2e page objects locate elements by them:

1. **Container** — `.btn`. Square corners, 2 px rule, height from the size.
2. **Label** — text node. It is the accessible name.
3. **Icon (optional)** — `.icon`, `aria-hidden="true"`, `currentColor`.

State which element is the Angular host and which is the inner native element
(for example: host `sh-button` is `display: inline-flex`; the classes go on the
inner `<button>`).

## API

A table of inputs, then outputs, then content slots.

| Input | Type | Default | Required | Rule |
|---|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ink' \| 'ghost' \| 'link' \| 'danger'` | `'secondary'` | no | Maps to `.btn--{variant}`; secondary adds no modifier class. |
| `busy` | `boolean` | `false` | no | Sets `aria-busy` and `aria-disabled`; never native `disabled`. |

- Inputs are Angular signal inputs; booleans accept bare attributes
  (`booleanAttribute`).
- Outputs: name them in the past tense of the user's action (`pressedChange`,
  `dismissed`). Say what payload they carry.
- Slots: one line per `ng-content` (default, `[slot=icon]`…). Each slot is
  declared once; a component that renders different elements by condition puts
  its slots in one `<ng-template>` (AGENTS.md).
- Translation: every user-facing string arrives as an input or a slot, never
  hard-coded in the component (L2-111). Name the inputs that carry copy.

For a built component, write the API it **should** have per the design system,
and list differences from the current code under *Implementation notes*.

## Variants and sizes

A table of variants (when to use each, the modifier class) and a table of sizes
(the token behind the height, padding and type). If there is one size, say so
and say what decides the width.

## States

A table: state, how it is triggered (CSS pseudo-class or attribute), what
changes visually, and what changes for assistive technology.

| State | Trigger | Visual | Assistive technology |
|---|---|---|---|
| Hover | `:hover` | Lifts by `--transform-lift` over `--shadow-1` | — |
| Focus | `:focus-visible` | `--color-focus-ring` ring, `--focus-ring-width`, `--focus-ring-offset` | — |
| Busy | `aria-busy="true"` + `aria-disabled="true"` | Spinner after the label; colours kept | Name kept; focus kept |
| Disabled | `disabled` | Sunken fill, muted label | Removed from tab order |

Cover the interaction states (default, hover, focus, active), the data states
(selected, pressed, expanded, current, checked, invalid), the lifecycle states
(loading, empty, error, busy, disabled) and the surface contexts (on the stage,
on the band, inside a toast) that the design-system page shows.

## Markup

The rendered DOM the component must produce, copied from the design-system page
and corrected for any drift it lists. Give one fenced `html` block per
structurally different variant or state (default, with icon, icon-only,
toggle, busy, link-styled). Leave out blocks that differ only in a modifier
class; say in a sentence which modifier each variant adds. Then show the
Angular usage, the consumer's template, for the main configurations:

```html
<!-- rendered -->
<button class="btn btn--primary btn--lg" type="submit" aria-busy="true" aria-disabled="true">Finding makers near you…</button>
```

```html
<!-- consumer -->
<sh-button variant="primary" size="lg" type="submit" [busy]="searching()">{{ 'discover.search.submit' | transloco }}</sh-button>
```

The e2e page objects locate elements by these classes and attributes, so the
markup is part of the contract. Mark any element whose structure is free to
change as such.

## Design

Spacing, typography, shape, elevation, motion and layering, each as tokens:

- Height `--control-height-md`; side padding `--space-5`.
- Label `--text-label`, letter spacing `--letter-spacing-wide`, uppercase by CSS
  (the source copy stays sentence case).
- Rule `--border-width-thick`, radius `--radius-md`.
- Transitions `--duration-fast` with `--ease-standard`.

List the component tokens it declares (`--btn-bg`, `--btn-fg`…) and which
semantic token each aliases, since surfaces re-skin the component by
overriding these.

## Colour

A table of parts and the semantic token for each, in light and in dark. Write
the token or the primitive it resolves to in each theme — never a hex value;
the HTML rendering shows live resolved values.

| Part | Token | Light | Dark |
|---|---|---|---|
| Primary fill | `--color-accent` | `--palette-signal-500` | `--palette-signal-500` |
| Secondary rule | `--color-border-strong` | `--palette-ink-700` | `--palette-ink-300` |

Then the contrast pairs the component relies on, with the WCAG minimum for
each (4.5:1 text, 3:1 large text, borders and focus indicators — L2-103), taken
from `tokens/contrast-pairs.json`:

| Foreground | Background | Minimum | Use |
|---|---|---|---|
| `--color-fg-on-accent` | `--color-accent` | 4.5:1 | Label on primary |

Note forced-colours (Windows high contrast) behaviour when the tokens define
it.

## Responsive behaviour

Behaviour at each breakpoint that changes anything (XS < 576, SM ≥ 576, MD ≥
768, LG ≥ 992, XL ≥ 1200 px), plus the universal rules: no horizontal scroll or
clipped text at 320 px, content and functions available at 200 % zoom, and touch
targets of at least 44 × 44 CSS px (L2-096). Say whether text wraps or
truncates (it wraps, almost always).

## Accessibility

Subsections, each as short requirement statements:

- **Role and pattern** — the native element or the ARIA role, and the APG
  pattern it follows (link it).
- **Keyboard** — a table of keys and actions.
- **Focus** — where focus goes, how it looks, and where it returns.
- **Labelling** — the accessible name, description and state attributes.
  WCAG 2.5.3 Label in Name when `aria-label` extends a visible label.
- **Announcements** — live regions, if the component announces anything.
- **Motion** — what animates and what `prefers-reduced-motion` does.

## Content and internationalisation

Copy rules from the design-system *Content* section, with real examples from
the cast. Date, time, money and distance formats per L2-110 ("Sat 14 Nov",
"7:00 p.m.", "$1,800", "44 km"). Which strings are inputs (translatable) and
which come from data (names, places). How long strings behave — French runs
about 30 % longer than English.

## Performance

- **Change detection** — `OnPush`, signal inputs, no work in templates that a
  `computed` could hold.
- **Perf-test scenario** — the file
  (`frontend/projects/perf-test/src/scenarios/<Name>.ts`), the realistic
  instance it renders (name the cast member and copy), and that its
  iterations are tuned in `e2e/perf-test/config/scenario-iterations.mjs` so it
  renders in roughly 100–300 ms. Name any composite scenario the component
  appears in (`MenuWeek`, `DarkTheme`…).
- **Regression rule** — a change to its template, inputs, styles or change
  detection is measured against the base branch with `--fail-on-regression`
  before it is pushed.
- **Layout stability** — reserved dimensions, a skeleton matching the final
  layout, nothing that shifts after load (L2-086, L2-105).
- **Weight** — dependencies it may import, and anything it must not pull in
  (for example, a page-level library).

## Acceptance criteria

Numbered `AC-1`, `AC-2`…, each a single Given/When/Then sentence ending with
the L2 ID in parentheses. See `traceability.md` for how to choose the ID.

```markdown
- **AC-1** Given a primary button labelled "Request to book", when it renders in the light theme, then it has the `.btn.btn--primary` classes, a `--color-accent` fill and a label contrast of at least 4.5:1. (L2-103)
- **AC-2** Given a submit button labelled "Request to book", when the form is submitted and the request is pending, then the button shows "Sending request…", has `aria-busy="true"` and `aria-disabled="true"`, keeps focus, and a second press sends nothing. (L2-108)
```

Group them with `###` subheadings (Rendering, Variants, States, Keyboard and
focus, Screen readers, Theming, Responsive, Motion, Performance) so a slice can
take one group at a time.

## Implementation notes

For a built component: the gaps between the code and this CRD (missing
variants, sizes, states, attributes), each as a bullet a future slice can pick
up. For a planned component: the library folder, selector and file names it
will use (TypeScript names drop the `Zm` prefix), any CDK primitive it builds
on (Dialog, Overlay, Listbox…), and the components it composes.

## Decisions

Every place the sources were silent or ambiguous, and what the CRD decided.
Number them `D-1`, `D-2`…; give each the question, the decision and the reason,
grounded in the design system, L2 or the repository conventions:

- **D-1** *Does the danger button have a hover lift?* Yes, the same as
  every framed variant. The design-system page renders a danger hover in the
  states matrix, and one lift rule keeps the variants consistent.

A decision is final for the CRD: the engineer builds it without asking again.
Genuine conflicts between sources, which only product or design can settle, are
not decided here. Ask the user, then record the answer as a decision citing
them. Write "None." only when the sources really covered everything.

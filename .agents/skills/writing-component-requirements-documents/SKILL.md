---
name: writing-component-requirements-documents
description: >-
  Write a Component Requirements Document (CRD) for a UI component: a pair of
  files, docs/specs/components/<component>.md and <component>.html, that hold
  every requirement needed to build it — anatomy, API, variants, sizes, every
  state, design tokens, colour in light and dark, responsive rules, WCAG 2.2 AA
  accessibility, content and i18n, render performance, for every place the
  product uses it, complete enough to build the whole component without later
  API changes — plus component-specific
  Given/When/Then acceptance criteria that each trace to an L2 requirement, and
  an HTML page rendering the component in every state in both themes. Use this
  skill whenever the user mentions a CRD, component requirements, a component
  spec, "spec this component", acceptance criteria for a component, or is about
  to build, rebuild or change a sh-* (or any design-system) component in a
  components library; and proactively when a component has a design-system
  page or mock but no CRD yet. CRDs come after L1/L2 requirements and after the
  design system or mocks: if either is missing, say so and stop.
---

# Writing component requirements documents

A CRD is the single place an engineer reads before building one component. It
gathers what is otherwise scattered across L2, the design-system page, the
mocks and the repository conventions, and states it as testable requirements.

**The completeness bar:** an engineer must be able to build the component in its
entirety by implementing the CRD, and the component must not need to change
afterwards. Two things follow:

- The CRD specifies the component for **every** place the product uses it,
  across all mocks and milestones, not just the screen being built next. If a
  later screen needs a variant, input, slot or state, it is in the CRD now.
  Otherwise the API gets reshaped later and every consumer changes with it.
- The CRD leaves nothing open. Where the sources are silent, it decides and
  records why. Where they conflict in a way only product or design can settle,
  writing stops and the conflict goes to the user.

It is two files with the same name, and the pair is the CRD:

```
docs/specs/components/
  README.md               index: one row per component, status, L2 trace, links
  <component>.md          the requirements (sections below), ending in GWT criteria
  <component>.html        the rendering: every variant × size × state, light and dark
```

`<component>` is the design-system page slug (`button`, `dish-card`, `date-picker`).
A component documented in a foundation page rather than a component page (an
icon set, for example) uses its library folder name.

Read the references as you reach the steps that need them:
- `references/crd-sections.md` — what goes in each section, with worked examples.
- `references/traceability.md` — how to choose L2 IDs and write criteria that trace.
- `assets/templates/crd.md` and `assets/templates/crd.html` — start every CRD from these.

Resolve `references/`, `assets/` and `scripts/` relative to this installed skill's
folder. Resolve `docs/` and `frontend/` paths relative to the consuming project.

---

## Step 0 — Check the gate (a hard stop)

A CRD restates decisions already made upstream; it never makes them. Writing one
before those decisions exist produces requirements nobody agreed to, so check
all three before writing anything:

1. `docs/specs/L1.md` and `docs/specs/L2.md` exist.
2. The component has a page in `docs/design-system/components/` (or a foundation
   page that defines it), or it appears in `docs/mocks/`. The design system is
   preferred; mocks alone are enough only when there is no design system yet.
3. At least one L2 requirement governs the component's behaviour, content,
   layout, accessibility, theming or performance.

If any check fails, stop. Tell the user which artifact is missing and which
skill produces it (`engineering-requirements` for L1/L2, `writing-html-mocks`
for mocks, `extracting-design-systems` for the design system). Do not draft a
partial CRD "to be filled in later".

## Step 1 — Gather the inputs

If `docs/specs/components/` already holds CRDs, read one simple control and one
composite first, and match their depth and conventions. Read every CRD whose
component this one composes or is composed by, and keep the APIs they assume
(a slot, an input name, a badge variant) unless you change both in the same
pass.

Read, for this component:

- **The design-system page** — all of it. Its sections (overview, anatomy,
  variants, sizes, states, responsive, theming, accessibility, content,
  do/don't, tokens, code, sources) are the raw material. Every state it renders
  must appear in the CRD.
- **Every usage in the mocks.** Not just the ones the design-system page lists
  under *Sources*. Search all of `docs/mocks/` (pages, dialogs, notifications)
  for the component's block class with the bundled inventory script:
  `python "<installed-skill-folder>/scripts/usage_inventory.py" docs/mocks btn "a|button"`.
  It groups every use by element, modifier classes and extra classes, and
  lists the screens, attributes and labels. For each usage, record the configuration
  it needs: variant, size, which slots are filled, which states occur, the
  surface it sits on, and its copy. This usage inventory is what makes the API
  complete. Every row must be buildable with the API the CRD defines.
- **L2** — search `docs/specs/L2.md` for the component's name, its content, and
  the cross-cutting requirements (layout, accessibility, theming, loading,
  forms, toasts, formatting, translation, performance). See
  `references/traceability.md`.
- **Tokens** — `docs/design-system/tokens/tokens.css` for semantic tokens,
  `docs/design-system/assets/components.css` for component tokens and the BEM
  classes, `tokens/contrast-pairs.json` for the contrast minimums.
- **The cast** — `docs/mocks/README.md`. Use its people, churches, dates and
  prices in examples and criteria so every CRD reads like the same product.
- **Existing code**, if the component is built
  (`frontend/projects/components/src/lib/<component>/`), and its perf-test
  scenario. Record the current API, then note every gap between the code and
  the design system in *Implementation notes*. The CRD states the requirement;
  the code is not the requirement.
- **Repository rules** in `AGENTS.md` (selector prefix, BEM parity, token use,
  slot rules, CDK for overlays, perf-test scenarios) — they become requirements
  in the API, Design and Performance sections.

## Step 2 — Write the Markdown

Copy `assets/templates/crd.md` to `docs/specs/components/<component>.md` and fill
every section, following `references/crd-sections.md`. Points that matter most:

- **Requirements are statements, not descriptions.** "The busy button keeps
  focus and ignores further presses" is testable; "the button has a nice busy
  state" is not.
- **Name tokens by role, never by value.** Write `--color-accent`, not a hex
  code. The HTML shows resolved values live, so the Markdown never goes stale
  when a token changes.
- **Every state, every variant.** If the design-system page shows it, the CRD
  specifies it; if the mocks or L2 need one the page forgot (an error state, a
  long-name wrap), the CRD specifies it too and records it under *Decisions*,
  so the design-system page can catch up.
- **Acceptance criteria are Given/When/Then, numbered `AC-1`, `AC-2`…, and each
  ends with the L2 ID it serves** — `(L2-108)`. Use the cast and exact UI
  strings in quotes. Cover the default render, each variant, each state, the
  keyboard path, the screen-reader output, both themes, the smallest viewport,
  reduced motion and the render-performance budget. A component of any
  substance has 12–30 criteria.
- **No criterion without a trace.** If a requirement matters but no L2 covers
  it, it is a design-system rule: state it in its section and cite the
  design-system page. Never invent an L2 ID.
- **Give the exact markup.** The *Markup* section shows the rendered DOM for
  each variant and state, so an engineer never has to reverse-engineer it from
  the design-system page.
- **Decide, don't defer.** When the sources are silent, for example a state the
  design system never rendered or behaviour no L2 mentions, choose the option
  most consistent with the design system and L2. Record it under *Decisions*
  with the reason.
- **Stop on real conflicts.** If two sources genuinely conflict (the mock and
  the design system disagree on behaviour, or an L2 criterion contradicts the
  design system), stop. Ask the user, then record the answer as a decision.
  Nothing is left "TBD", "TODO" or "open"; the checker rejects those words.

## Step 3 — Write the HTML rendering

Copy `assets/templates/crd.html` to `docs/specs/components/<component>.html`. It
links the design system's real stylesheets, so what it renders is the
component, not a picture of it:

- Copy the markup from the design-system page and mocks exactly — the BEM
  classes and ARIA attributes are part of the contract.
- Render a matrix of every variant × every state, then every size, then the
  same set side by side under `data-theme="light"` and `data-theme="dark"`.
- Force pointer and focus states with `data-state="hover|focus|active"`; use the
  real attributes for the rest (`disabled`, `aria-busy`, `aria-pressed`,
  `aria-expanded`, `aria-invalid`, `aria-current`…).
- Show width frames (320, 360, 768) when the component's layout changes across
  breakpoints, and skip them when it does not, saying so. Component CSS uses
  viewport media queries, so a narrow `<div>` shows the desktop layout. Render
  each frame as an `<iframe srcdoc>` of that width that links the same two
  stylesheets; `srcdoc` resolves relative URLs against the page. Generating the
  page with a short script keeps the escaping correct.
- Always render what the component must look like, not what today's CSS
  draws. When a decision or requirement changes the look (tighter padding at
  XS, a different colour for a state), apply it with a style block commented
  `/* Specimen only, not product CSS: <component> D-n */`. Label the
  specimen "required (D-n)". A "current (drift)" specimen beside it is
  optional and shows what changes.
- Use the cast's real copy, including the longest name. The narrow frames are
  where wrapping problems show up, and what they reveal becomes a requirement
  and a decision.
- Label every rendering with the acceptance criteria it illustrates
  (`AC-4, AC-5`), so a reviewer can move between the two files.
- Include the contrast pairs with `data-contrast="--fg|--bg"` and the token
  table with `data-token`; `ds.js` fills in live values and ratios for the
  current theme.

## Step 4 — Check

```sh
python "<installed-skill-folder>/scripts/check_crds.py" docs/specs/components
```

The checker fails on: a Markdown file without its HTML (or the reverse), a
missing required section, no acceptance criteria, a criterion without an L2 ID,
an L2 ID that does not exist in `docs/specs/L2.md`, a token named in the
Markdown that is not defined in the design system, a hex colour in the
Markdown, and an HTML file that does not link the design-system stylesheets or
lacks a light and a dark rendering. It also fails on:
- a *Traces to* row that differs from the IDs the criteria cite;
- AC numbering with gaps;
- a template placeholder left in;
- the words TBD, TODO or "open question".

It warns when an `AC-n` in the Markdown is never referenced in the HTML. Fix
every error.

Then look at it. The bundled script takes full-page screenshots in light and
dark at 1280 and 360 px with Chromium. It also reports horizontal overflow,
failed stylesheet requests and script errors:

```sh
node "<installed-skill-folder>/scripts/screenshot_crds.mjs" e2e/package.json .cache/crds docs/specs/components/<component>.html
```

The first argument is any `package.json` whose `node_modules` has
`@playwright/test`. Read the PNGs and check:
- every specimen is styled;
- nothing is clipped in the narrow frames;
- the dark-theme renderings look intentional.

Fix the CRD for anything the pictures show, including requirements the
pictures prove wrong. Never commit `.cache/`. If no browser is available, say so
and review the HTML by reading it.

## Step 5 — Update the index

Add or update the component's row in `docs/specs/components/README.md`:
component, selector, status (`built` when it exists in the library, otherwise
`planned`), L2 trace, links to both files and the design-system page. Keep rows
alphabetical.

Finish by stating which CRDs were written, their criteria counts, the L2 IDs
they trace to, and the decisions recorded where the sources were silent.

## Before you call it done

Ask this of the finished pair: could an engineer who has read only these two
files and `AGENTS.md` build the whole component, pass every acceptance
criterion, and never come back to change its API when the next screen is
built? Check each of these:

- [ ] Every usage in the inventory is buildable with the API as written.
- [ ] Every state on the design-system page, and every state in the mocks, is
      in the States table, the Markup section, the HTML and at least one
      criterion.
- [ ] Every input, output and slot has a type, a default and a rule.
- [ ] Every colour, size, space, duration and layer is a named token.
- [ ] Keyboard, focus, naming and announcements are specified for every
      interactive part.
- [ ] The perf-test scenario is named, with the cast member it renders.
- [ ] The *Decisions* section explains every place the sources were silent,
      and nothing reads as undecided.

## How a CRD is used afterwards

A CRD is a design artifact, so the ATDD rule does not apply to writing it.
It feeds implementation: each implementation slice
(`implementing-incrementally`) takes one group of acceptance criteria, turns
them into failing acceptance tests through page objects, and builds that part
of the component. Slices implement the CRD; they do not redesign it. When the
last group passes, the component is complete.

The CRD changes only when its inputs change: a new or changed L2 requirement,
a new mock that uses the component, or a design-system change. That change
happens upstream first and comes through the CRD before any code. If a slice
finds the CRD wrong or incomplete, that is a defect in the CRD. Fix the CRD in
the same pull request, and when you write the next CRD, catch the same gap with
the checklist above.

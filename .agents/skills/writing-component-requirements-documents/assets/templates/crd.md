# {Component name}

| Field | Value |
|---|---|
| Selector | `sh-{component}` |
| Library path | `frontend/projects/components/src/lib/{component}/` |
| Status | {built \| planned} |
| Traces to | {L2-xxx, L2-yyy — the sorted union of the IDs cited in the acceptance criteria} |
| Design system | [`{component}.html`](../../design-system/components/{component}.html) |
| Source mocks | [`pages/{page}/{state}`](../../mocks/pages/{page}/{state}.html), … |
| Rendering | [`{component}.html`]({component}.html) |

## Purpose and scope

{What the component is for, in the product's words. When to use a sibling
component instead, with links to their CRDs.}

Out of scope:

- {Behaviour that belongs to the page or a parent component.}

## Usage

| Where | Configuration | Slots / content | States seen | Surface |
|---|---|---|---|---|
| `{pages/…/default}` | {variant, size, options} | {copy} | {states} | {canvas, surface, stage, band, dialog} |

## Anatomy

1. **{Part}** — `.{block}__{element}`. {Rule.}

Host: {what the `sh-*` element is and what it renders inside}.

## API

### Inputs

| Input | Type | Default | Required | Rule |
|---|---|---|---|---|
| `{name}` | `{type}` | `{default}` | {yes \| no} | {rule} |

### Outputs

| Output | Payload | Emitted when |
|---|---|---|
| {`name` \| None — say why} | | |

### Content slots

| Slot | Accepts | Rule |
|---|---|---|
| {default \| `[slot=name]` \| None} | | |

## Variants and sizes

| Variant | Modifier | Use for |
|---|---|---|
| {name} | `.{block}--{variant}` | {when} |

| Size | Modifier | Height | Padding | Type |
|---|---|---|---|---|
| {md} | — | `--control-height-md` | `--space-5` | `--text-label` |

## States

| State | Trigger | Visual | Assistive technology |
|---|---|---|---|
| Default | — | | |
| Hover | `:hover` | | — |
| Focus | `:focus-visible` | | |

## Markup

```html
<!-- rendered: default -->
```

```html
<!-- consumer -->
```

## Design

- {Spacing, typography, shape, elevation, motion and layer tokens.}

Component tokens:

| Token | Aliases | Overridden by |
|---|---|---|
| `--{block}-{prop}` | `--color-…` | {surface or modifier} |

## Colour

| Part | Token | Light | Dark |
|---|---|---|---|
| {part} | `--color-…` | `--palette-…` | `--palette-…` |

| Foreground | Background | Minimum | Use |
|---|---|---|---|
| `--color-…` | `--color-…` | 4.5:1 | {use} |

## Responsive behaviour

- {Behaviour per breakpoint that changes anything.}
- At 320 px nothing scrolls horizontally or clips; at 200 % zoom everything stays available; every target is at least 44 × 44 CSS px on touch devices.

## Accessibility

### Role and pattern

{Native element or role; APG pattern.}

### Keyboard

| Key | Action |
|---|---|
| <kbd>Tab</kbd> | |

### Focus

### Labelling

### Announcements

### Motion

## Content and internationalisation

- {Copy rules with cast examples.}
- Translatable inputs: {list}. Data values: {list}.

## Performance

- Change detection: `OnPush`, signal inputs.
- Perf-test scenario: `frontend/projects/perf-test/src/scenarios/{Name}.ts` renders {cast member and copy}; iterations in `e2e/perf-test/config/scenario-iterations.mjs` keep it at roughly 100–300 ms.
- Composite scenarios: {MenuWeek, DarkTheme, … or None}.
- Layout stability: {reserved size, skeleton}.

## Acceptance criteria

### Rendering

- **AC-1** Given {context}, when {action}, then {observable result}. (L2-xxx)

### States

### Keyboard and focus

### Screen readers

### Theming

### Responsive

### Motion

### Performance

## Implementation notes

- {Built: gaps between the code and this CRD. Planned: folder, selector, files, CDK primitives, composed components.}

## Decisions

- **D-1** *{Question the sources left open?}* {Decision.} {Reason.}

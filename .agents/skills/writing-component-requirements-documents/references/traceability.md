# Traceability

Every CRD traces to L2, and every acceptance criterion names the one L2
requirement it proves. This is what makes the CRD a requirement rather than a
style guide. When the criterion is turned into a test, the L2 ID travels with
it, so a failing test points at the requirement it protects.

## Finding the L2 IDs

L2 IDs look like `L2-006`. Copy them exactly as they appear in
`docs/specs/L2.md`; never renumber or invent one. Search L2 in two passes.

**1. Component-specific requirements.** Search for the component's name and
for the content it shows. A dish card is governed by "Dish card content";
a pre-order summary by "Pre-order summary"; a rating by "Rating calculation". The
criteria in those requirements usually name exact strings and data — reuse
them.

**2. Cross-cutting requirements.** Most components are also governed by the
product-wide rules. Look for requirements about:

| Concern | What to look for in L2 |
|---|---|
| Layout | breakpoints, 320 px, 200 % zoom, 44 px targets, page-specific layouts |
| Accessibility | WCAG conformance, keyboard and focus, assistive technology, motion and contrast |
| Theming | light and dark themes, first paint, preference storage |
| Loading | skeletons, `aria-busy`, layout shift |
| Errors and empties | the error and no-results requirements of the pages it appears on |
| Forms | submission safety (busy, double-submit), validation messages |
| Notifications | toast timing and stacking |
| Formatting | dates, times, money, distance |
| Translation | strings from the catalogue, no hard-coded copy |
| Performance | page speed (LCP, INP, CLS), bundle budget |

Read the acceptance criteria of each candidate, not just its title. Cite an L2
requirement only if a criterion of the CRD would fail when the component broke
that requirement.

## Writing a criterion that traces

- **One behaviour, one criterion, one ID.** If a sentence needs two IDs, it is
  two criteria.
- **Make it specific to the component.** L2 says "every interactive control has
  a 44 × 44 px target"; the button CRD says "Given a small button in a menu-item
  row, when the row is measured on a touch device, then the button's target,
  including the row's padding, is at least 44 × 44 CSS px. (L2-096)".
- **Use the cast and exact strings.** "Save Auntie Bev's Kitchen to your saved makers",
  "Sat 14 Nov", "$18.50" — so a test author can copy them.
- **State the observable result** — a class, an attribute, an announced name, a
  measured ratio, a focus position, a duration — not an intention.

## When nothing in L2 fits

Some rules come from the design system rather than from L2: "one primary
button per view", "the busy state never uses native `disabled`". Two choices:

1. If an L2 requirement is the reason for the rule (busy state → L2-108 form
   submission safety), trace to it.
2. If no L2 requirement is the reason, keep the rule in the relevant section as
   a design-system requirement (cite the design-system page) without an `AC-n`.
   It is still binding: the engineer builds it and review checks it. Do not
   invent an L2 ID, and do not attach an unrelated one to make the checker pass.
   If the rule is important enough that it should be tested, tell the user it
   needs an L2 requirement. Adding one is an `engineering-requirements` change,
   not something the CRD does.

## The index

`docs/specs/components/README.md` lists every CRD with its L2 trace, so
anyone changing an L2 requirement can find every component it affects. Keep
it in step with the CRDs' metadata tables.

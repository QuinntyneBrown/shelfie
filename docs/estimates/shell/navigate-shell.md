# Estimate — Navigate the shell

## Basis

Hours for an intermediate Angular/TypeScript developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object (Chromium only, with `@axe-core/playwright`), and review fixes. They exclude the requirements, mocks, design system and this design. The `core` library's `SessionService` and the Angular workspace with the `components` library scaffold are assumed present from the `platform` subsystem; the design tokens are taken from `docs/design-system/`. `sh-streak-badge` is assumed paid for by `track-streak`, and the field components that carry `aria-describedby` errors by the features that introduce them. The streak and queue badge values refresh once per page load and from mutation responses, by the owning features. [Detailed design](../../detailed-designs/shell/navigate-shell/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `AppComponent` shell: skip link, `<main>` landmark, reader and grown-up variants from `SessionService`, banner and toast slots, menu selection routing | 2 |
| `sh-top-bar` (brand, streak badge slot, primary links from 768 px, queue badge, avatar button) | 2 |
| `sh-tab-bar` (fixed bottom bar, icons, `aria-current`, safe-area padding, hidden from 768 px) | 1 |
| `sh-menu` (menu button pattern: open keys, arrow and Home/End movement, Escape with focus return, outside click) | 3 |
| `sh-dialog` (native `<dialog>`, bottom sheet under 640 px, focus into panel and return to trigger) | 2 |
| Global styles: 16 px gutter, containers, `:focus-visible`, 44 px targets, light and dark token pairs, `prefers-reduced-motion` | 1 |
| Playwright acceptance tests via `ShellPage` page object (360/768/1280 overflow, bar switch, menu keyboard contract, dialog focus return, axe scan) | 2 |
| **Total** | **13** |

## Minimal scope

`AppComponent` with the skip link, `<main>`, `sh-top-bar` with the grown-up links always visible (no `sh-tab-bar`), a plain `<a>`-based account menu without the arrow-key contract, `sh-dialog` as a centred panel at every width, and the global focus, gutter and reduced-motion styles. This still satisfies `L2-025` criteria 1, 3 and 4 and `L2-026` criteria 1, 2, 3, 4 and 5; it defers `L2-025` criterion 2 (bottom sheets), the phone tab bar of `L2-014` criterion 4 and the axe scan of `L2-026` criterion 6. Total: 8 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `sh-tab-bar`; show the top-bar links at every width | Thumb-reach navigation on phones; `L2-014` criterion 4 | 1 |
| `sh-menu` without arrow-key movement (Tab between items; Escape still closes and returns focus) | WAI-ARIA menu keyboard contract shown in the mock note | 1 |
| `sh-dialog` as a centred panel at every width | Bottom sheets under 640 px (`L2-025` criterion 2) | 1 |
| Drop the axe scan from the acceptance tests | Automated check for `L2-026` criterion 6; violations found only in manual review | 1 |

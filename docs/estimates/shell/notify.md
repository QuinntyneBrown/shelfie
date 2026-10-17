# Estimate — Notify with toasts and banners

## Basis

Hours for an intermediate Angular/TypeScript developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through a page object (Chromium only), and review fixes. They exclude the requirements, mocks, design system and this design. The `core` and `components` library scaffolds and `AppComponent` with its banner and toast slots are assumed present from the `platform` subsystem and the `navigate-shell` feature. The auto-dismiss delay is the mock's 8 s. Callers' copy and the triggering flows are owned by their own features and are not costed here. [Detailed design](../../detailed-designs/shell/notify/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `ToastService` (signal queue, 8 s timers, pause/resume, action and danger exemptions) and `BannerService` (signal queue, show/clear) | 1 |
| `sh-toast` (severity icon, title, message, action, Dismiss, hover/focus pause events) | 1 |
| `sh-toast-stack` (live region, bottom-edge positioning at XS and from 640 px, newest-at-edge order, +N more collapse, reduced-motion) | 2 |
| `sh-banner` (severity styles, status/alert role, action, dismissible close) and slot rendering in `AppComponent` | 1 |
| Playwright acceptance tests via `NotificationsPage` page object (live region, timed dismissal, pause on hover/focus, order, collapse, banner persistence across routes) | 2 |
| **Total** | **7** |

## Minimal scope

`ToastService` and `sh-toast-stack` with one toast at a time (no stacking or collapse) and `BannerService` with `sh-banner` for `role="status"` only; auto-dismiss and the action exemption kept; no timer pause. This still satisfies `L2-023` criteria 1 and 3 and defers criteria 2 (stacking order) and 4 (pause on hover or focus). Total: 4 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the "+N more" collapse; show every toast | Stack can cover the page when more than three toasts arrive | 1 |
| Drop timer pause on hover and focus | `L2-023` criterion 4; a reader reading a toast can lose it | 1 |

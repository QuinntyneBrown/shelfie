# Estimate — Push notifications for feedback

## Basis

Hours for an intermediate Angular/TypeScript and Node.js developer who has not seen this codebase and has not used the Push API before. The hours cover implementation, API tests, Playwright acceptance tests through page objects (Chromium only) and review fixes. They exclude the requirements, mocks, design system and design already done. The `web-push` package, `rate-limit.ts`, `ToastService`, `sh-banner`, `sh-button` and the settings form are present and reused. The end-to-end proof that `sw.js` shows a notification rests on the DevTools Protocol `ServiceWorker.deliverPushMessage` working in Chromium; if it does not, the API side is still proved through the recording fake and the figure holds. [Detailed design](../../detailed-designs/shell/push-notifications/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Migration `010-push.sql` (subscription table, four household columns) | 1 |
| `push.ts`: `Push`, `createPush`, `web-push` send and `gone`, `push` option on `createApp` | 3 |
| `push.router.ts`, `push.service.ts`: key, subscribe, unsubscribe, zod bodies, `pushLimiter` | 5 |
| `notify()`, the four messages and `STICKER_LABELS` | 4 |
| Four triggers, including the undo-window timer and the unreviewed check | 4 |
| `notifications` in `getSettings` and `PATCH /api/settings` | 2 |
| API tests: `push.test.ts`, `push-notify.test.ts`, settings (L2-121 to L2-128) | 6 |
| `sh-switch` in the `components` library | 3 |
| `PushService`, `PushApi` and the sign-out `forget()` in `core` | 5 |
| `sw.js` with the `push` and `notificationclick` handlers | 2 |
| `NotificationsSection` in Settings (device switch, four switches, blocked and unsupported states, toasts) | 5 |
| `PushOffer` on the shelf with the `localStorage` dismissal | 3 |
| Playwright: fake `Push` in `e2e/support/test.ts`, page objects, `push-notifications.spec.ts` | 6 |
| Caddy `no-cache` for `/sw.js`, runbook variables and key generation | 1 |
| **Total** | **50** |

## Minimal scope

The parent's chapter notification only: the migration without the four columns, `push.ts`, the key and subscribe routes, the chapter trigger, `PushService`, `sw.js` and a Settings card with only the device switch. It satisfies `L2-121`, `L2-122`, `L2-125` and `L2-128`, and defers `L2-123`, `L2-124`, `L2-126` and `L2-127`. It costs 33 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the four household switches; every event always sends | `L2-124`; no way to silence one event | 6 |
| Drop the reader's shelf offer; readers turn on from a parent's signed-in device only | `L2-123` | 3 |
| Drop the streak and book reward notifications | `L2-127` | 3 |
| Drop the sign-out `forget()`; rely on 404 and 410 pruning | `L2-128` criterion 5; a parent's pings may reach a reader on a shared device | 2 |
| Drop the end-to-end check of `sw.js`; prove the API side only | No browser-level proof that the notification shows | 3 |

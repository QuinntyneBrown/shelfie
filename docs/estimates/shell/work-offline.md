# Estimate — Work offline

## Basis

Hours for an intermediate Angular/TypeScript developer who has not seen this codebase and has read the `@angular/service-worker` documentation once. The hours cover implementation, Playwright acceptance tests through page objects (Chromium only, using `context.setOffline` and `page.route`), and review fixes. They exclude the requirements, mocks and this design. `ApiClient`, `ToastService`, `BannerService` and `DraftStore` are assumed present from `platform` and `notify`; `LogChapterPage`, `BookPage`, `sh-chapter-row` and `POST /api/books/:id/chapters/:n` from `log-chapter` and `view-book`; the `shelfie` application's production build from `platform`. The queue uses the raw IndexedDB API; the shelf cache `maxAge` is 7 days; a record rejected with 400 three times is dropped with its answers kept in `DraftStore`. No backend change is costed. [Detailed design](../../detailed-designs/shell/work-offline/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Service worker registration and `ngsw-config.json` (app shell prefetch; `/api/shelf` freshness data group); production build check | 2 |
| `OfflineQueue`: `online` signal from `navigator.onLine` and events; IndexedDB `shelfie-offline` store; `enqueue`, `isPending`, `pending` signal | 3 |
| Offline banner show/clear wiring and the offline warning toast | 1 |
| `LogChapterPage` offline branch (enqueue, clear draft, navigate) and `BookPage` "will send" row state | 1 |
| `replay()`: in-order posts, 2xx/409 delete with success toast, failure keeps record and stops, Retry toast, "Back online" toast, start-up replay | 2 |
| `OfflinePage` and redirect from a page whose load fails with status 0 while offline | 1 |
| Playwright acceptance tests via `BookPage`, `LogChapterPage` and `OfflinePage` page objects (banner and cached shelf, will send, in-order replay with toasts, failed send stays queued, 409 as sent, Offline page) | 2 |
| **Total** | **12** |

## Minimal scope

Service worker with the app shell and `/api/shelf` cache, the offline banner, `OfflineQueue` with `enqueue` and a replay that treats 2xx and 409 as sent and stops on any failure, and the "will send" row; no `OfflinePage` (an uncached page shows its own error state with retry) and no Retry toast. This still satisfies `L2-024` criteria 1, 2 and 3 and defers criterion 4 (the Offline page). Total: 9 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `OfflinePage`; uncached pages show their existing error state | `L2-024` criterion 4; the reader sees "Something went wrong" rather than "You're offline" | 1 |
| Drop the per-chapter success toasts; show only "Back online" | Confirmation of each queued chapter named in `L2-024` criterion 3 | 1 |
| Drop the start-up replay; replay only on the `online` event | Chapters queued before the tab was closed wait until the connection drops and returns again | 1 |

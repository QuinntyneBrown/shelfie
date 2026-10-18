# Estimate — Upload a profile photo

## Basis

Hours for an intermediate Angular/TypeScript and Node/Express developer who has not seen this codebase. The hours cover implementation, the migration, node:test API tests, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design system pages and this design. `ApiClient`, `SessionService`, `sh-dialog`, `sh-button`, `sh-banner`, `requireSession` and `csrfGuard` are assumed present from earlier slices and reused at 0 hours. [Detailed design](../../detailed-designs/settings/upload-profile-photo/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `002-profile-photo.sql`; `photos.service.ts` with `sharp` (type check, 40 MP limit, rotate, 256 × 256 WebP, no metadata), save, remove, household-scoped read | 5 |
| `photos.router.ts`: `PUT` (raw body, 5 MB, 413), `DELETE`, `GET` with `ETag`/304 and the sandboxing headers; photo URL on the session, `ParentView` and `ReaderView` | 4 |
| `sh-avatar` (initial, photo, broken-image fallback, sizes, label) and its use in `sh-top-bar`, Settings lists, accept-invite | 4 |
| `sh-photo-picker` (hidden file input in a label button, type and size checks, busy, error) | 3 |
| `ProfilePhotoDialog`, `ProfilePhotoApi`, `ApiClient.put`, `SessionService.update(photo)`, Settings photo row, reader "My photo" menu item, edit-reader colour help | 6 |
| API tests (processing, metadata stripping, erasure) and Playwright acceptance tests (parent and reader upload, replace, remove; validation; isolation, auth and headers) | 8 |
| **Total** | **30** |

## Minimal scope

Upload and remove for the signed-in person, shown only in the top bar; Settings lists keep the initial, there is no `ETag`/304 and the browser-side size and type checks are left to the server. This still satisfies `L2-042`, `L2-044` criteria 1–4 and `L2-045`, and defers `L2-043` criterion 1 for the lists and `L2-044` criterion 5. Total: 20 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop `ETag` and 304; serve with `no-store` | Repeat page loads download each photo again (about 15 kB each) | 1 |
| Drop the browser-side type and size checks | A 20 MB photo is sent before it is refused | 1 |
| Drop the "Try again" action on a failed upload | The person chooses the file again | 1 |

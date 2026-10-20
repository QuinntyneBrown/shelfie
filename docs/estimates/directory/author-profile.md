# Estimate — Author profile

## Basis

Hours for an intermediate Angular/TypeScript and Node.js developer, with sign-in, sessions, the photo and cover pipelines and the components library in place. The hours cover the migration, the join route, the session split, the `me` and `catalogue-books` routers, the `directory` library's author pages and dialogs, acceptance tests (API and Playwright) and review fixes. [Detailed design](../../detailed-designs/directory/author-profile/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| Migration `013-directory.sql` and seed and erasure changes | 2 |
| `requireDirectorySession`, `requireSession` turning away authors and volunteers, session photo URL and theme | 3 |
| `POST /api/auth/join`, `join()`, password reset for authors | 2 |
| `me.router.ts`, `me.service.ts`, `/api/me/photo` | 3 |
| `catalogue-books.router.ts`, service, covers | 4 |
| `JoinPage`, `AuthApi.join`, sign-in link and landing by role | 3 |
| `directory` library: `MyProfilePage` with photo and status banner, `MeApi` | 4 |
| `MyCataloguePage`, `CatalogueBookDialog`, `RemoveCatalogueBookDialog` | 6 |
| Guards, author shell navigation, `sh-tab-bar` icons | 2 |
| API and Playwright acceptance tests with page objects | 8 |
| **Total** | **37** |

## Minimal scope

Join, My profile without a photo, and a catalogue without cover pictures. This satisfies `L2-154`, `L2-155`, `L2-157` to `L2-160` and `L2-169` to `L2-173`. It defers `L2-156` and `L2-161`. Total: 29 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the author's photo | Profiles show initials only; `L2-156` is not met | 2 |
| Drop catalogue cover pictures | Catalogue books and the books parents add have colour covers only; `L2-161` is not met | 4 |
| Drop editing a catalogue book | An author removes and re-adds a book to change it; `L2-160` criterion 1 is not met | 2 |

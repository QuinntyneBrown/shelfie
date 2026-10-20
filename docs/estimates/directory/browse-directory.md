# Estimate — Browse the directory

## Basis

Hours for an intermediate Angular/TypeScript and Node.js developer, with the `directory` library, the directory tables and the author and volunteer profiles (`directory/author-profile`, `directory/volunteer-profile`) in place. The hours cover the parent's three pages, the read-only directory API, the Directory tab, the prefilled Add a book, acceptance tests and review fixes. [Detailed design](../../detailed-designs/directory/browse-directory/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `directory.router.ts` and `directory.service.ts`: list, author, volunteer, approved-only reads, 404 for every other case | 4 |
| Directory photos and covers with ETag, 304 and the picture headers | 2 |
| `DirectoryApi` and `DirectoryPage` with Authors / Volunteers, the no-vetting notice, loading, empty and error | 4 |
| `AuthorProfilePage` and `VolunteerProfilePage` with not-found and error | 4 |
| Directory tab in the shell (`sh-tab-bar` icon, routes and guards) | 1 |
| Add to shelf: `ShelfApi.catalogueBook`, prefilling `AddBookPage` with the cover, breadcrumb and button | 3 |
| API tests: parents only, readers 403, authors and volunteers 403, pending and hidden 404, no household data | 3 |
| Playwright tests and page objects (`directory`, `author-profile`, `volunteer-profile`, `add-book`) | 5 |
| **Total** | **26** |

## Minimal scope

The authors list, the author's page and the prefilled Add a book, without photos, covers or the volunteers view. This satisfies `L2-163` criteria 1 and 3, `L2-164`, `L2-167` without the picture, and `L2-168`. It defers `L2-165` and `L2-166`. Total: 16 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop directory photos and covers | Initials and colour-and-sticker covers only; `L2-166` is not met | 3 |
| Drop the cover from the prefill | The parent picks or uploads a cover by hand; part of `L2-167` criterion 1 | 1 |
| Drop the volunteers view and page | Volunteers cannot be found; `L2-165` is not met | 4 |

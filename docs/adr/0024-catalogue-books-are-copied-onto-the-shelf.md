# ADR-0024: Catalogue books are copied onto the household's shelf

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-167, L2-171, L2-160, L2-173

## Context

A parent adds an author's catalogue book to the household's shelf. A link from the household's `book` to the `catalogue_book` would let the author's later edits change a child's book, would make erasing an author touch households, and could reveal to the author which households added a book.

## Decision

1. "Add to shelf" opens the existing Add a book page at `/add-book?catalogueBook=:id`. The page reads the entry from `GET /api/directory/books/:id` (parents only, approved authors only), fetches its cover from `GET /api/directory/books/:id/cover` as a file, and fills in the title, the author's name, the chapter count and the picture.
2. Saving uses the unchanged `POST /api/books` and `PUT /api/books/:id/cover`. The household's book is a copy; no column, table or log line records the catalogue book it came from.
3. Later edits or removal of the catalogue entry, and erasing the author, leave the household's book and picture as they are.

## Consequences

- No new write endpoint and no change to `book`; Add a book's validation, colour, sticker and toast apply unchanged.
- Shelfie cannot tell an author how many families added a book (`L2-171`); showing authors statistics stays deferred.
- The cover is fetched and re-uploaded by the browser, so it goes through the same checks as any other cover.

# ADR-001: Send the Add a book picture after the book

## Status

Accepted, 18 October 2026.

## Context

On Add a book the reader or the parent may choose a cover picture (`L2-046`). The book does not exist until the form is submitted, so there is no book id to upload the picture against while the form is being filled in. `POST /api/books` takes JSON through `express.json` with a 16 kB limit, and profile photos already travel as the raw body of a `PUT` (`settings/upload-profile-photo`).

Three ways to send the picture were considered:

1. **Two requests:** create the book, then `PUT /api/books/{id}/cover` with the file.
2. **One multipart request** to `POST /api/books` carrying the fields and the file.
3. **Upload first** to a holding area, then pass a token with the book.

## Decision

Two requests. The page keeps the chosen `File` in memory and previews it with an object URL. After `POST /api/books` answers with the id it sends the picture with the same `PUT` that Manage a book uses. If the picture is refused or fails, the book stays added and the page shows a warning toast before going to the shelf.

## Consequences

- One upload endpoint serves both pages, with one set of checks, limits and tests.
- No multipart parser and no holding area: nothing to expire and no new dependency.
- A book can be added without its picture when the second request fails. The child is told and the book still works with its colour and sticker; a parent can add the picture on Manage a book. A reader cannot retry it herself, which is acceptable for an optional decoration.
- A file the server refuses (for example a renamed file that is not an image) is discovered only after the book exists, with the same outcome as a failure. The picker's type and size checks catch the common cases before submit.

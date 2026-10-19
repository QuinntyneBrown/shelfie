# ADR-0015: Finish certificates are PDFs drawn on the server with pdfkit

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-120

## Context

Item 19 of `docs/feature-enhancements.md` asks for a printable, personalised certificate when a book is finished. Everything on it (`readerName`, `title`, `author`, `chapterCount`, `finishedOn`, the cover colour and picture) is already assembled by `getBook` in `books.service.ts`. Three ways to make the paper were weighed: a print-styled Angular page and the browser's print dialog; HTML rendered to PDF by a headless Chromium on the API host; a PDF drawn directly in Node.

## Decision

1. **The API draws the PDF** with `pdfkit`, a pure-JavaScript library with no browser or native binary, in `certificate.service.ts`. One page, A4 landscape, light only.
2. **One route, same access as the book.** `GET /api/books/:id/certificate.pdf` uses `requireSession` and `requireRole('reader')`, as `GET /api/books/:id` does, so Nia and her parents can all fetch it. 409 `not-finished` for an unfinished book; 404 for another household's.
3. **An attachment, never cached.** `Content-Disposition: attachment`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, as the cover route does for images.
4. **Plain links in the app.** The three entry points are anchors with `download` pointing at the route; the session cookie carries the auth. No new component, Angular route or service.
5. **Drawn shapes, not emoji.** pdfkit's standard fonts have no colour emoji, so the book's sticker is not on the paper. The cover colour fills the band and frame, the cover picture is embedded when there is one (JPEG or PNG through `readCover`), and the seal is a drawn circle.

## Consequences

- One new runtime dependency (`pdfkit`) and its types; no Chromium on the VM, no new memory footprint beyond a buffer of a few hundred kilobytes per request.
- The same PDF prints the same from every device, which a browser print page cannot promise; the price is that the certificate's look is code in the service, not CSS, and `docs/mocks/pages/certificate` is a picture of it rather than its source.
- Text is set in Helvetica, pdfkit's built-in font, so no font file ships; a rounded display face to match the app would mean bundling one.
- Nothing is stored: the PDF is drawn on each request from the book's current data, so a renamed reader or re-titled book gets a fresh certificate.
- E-mailing the certificate (the deferred e-mail provider) would reuse the same buffer unchanged.

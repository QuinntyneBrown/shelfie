# ADR-0019: The parent picks a reader with a remembered segmented control

- Status: Accepted
- Date: 2026-10-19
- Requirements: L2-138, L2-139, L2-144

## Context

With books owned by readers (ADR-0018), parent pages that show one reader's records (Review, Books) and the action that creates one (Add a book) need to say which reader they are about. A household with one reader must look exactly as it does today.

## Decision

1. **Where.** Review, Books and Add a book show a "Reader" picker under the page title, only when the household has two or more readers. Manage book, Review a chapter and Give a reward belong to one book, so they name its reader (avatar and name) instead of offering a choice. The shelf is the reader's own page and shows no picker.
2. **What.** The picker is the existing `sh-segmented` control, one chip per reader, labelled with the reader's name and, on Review, the number of chapters waiting for that reader ("Nia · 2"). No new component.
3. **Remembered on the device.** The choice lives in `ReaderChoiceService` (`core`), a signal saved in `localStorage` under `shelfie.reader`. Choosing a reader on one page chooses her on the others. An unknown or missing choice falls back to the first reader by name. Nothing is stored on the server.
4. **API.** `GET /api/review`, `GET /api/books` and `GET /api/shelf` take `?reader=<id>` from a parent; `POST /api/books` takes an optional `readerId`. A reader session ignores the parameter and always gets her own records. A reader id outside the household answers 404.
5. **Shell badge.** Review's response lists the readers with their waiting counts, so the tab-bar badge still counts every chapter waiting in the household.

## Consequences

- Two parents on two devices may have different readers picked; that is intended.
- A household with one reader sends no `reader` parameter and sees no picker; its pages are unchanged.

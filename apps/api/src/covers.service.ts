import { createHash } from 'node:crypto';
import { get, run, type Db } from './db.ts';
import { processImage } from './photos.service.ts';
import { Problem } from './problem.ts';

export interface BookCover {
  image: Buffer;
  etag: string;
}

/** The picture URL as a column, for queries over `book b LEFT JOIN book_cover bc`; null without a picture. */
export const COVER_IMAGE_COLUMN = "CASE WHEN bc.etag IS NULL THEN NULL ELSE '/api/books/' || b.id || '/cover?v=' || bc.etag END";

/** The URL every cover loads; the version changes with each new picture. */
export function coverImageUrl(bookId: string, etag: string) {
  return `/api/books/${bookId}/cover?v=${etag}`;
}

/** A cover picture: the cover's 2:3 shape at twice the 160 px of the largest cover. */
export function processCover(bytes: Buffer): Promise<Buffer> {
  return processImage(bytes, 320, 480);
}

async function requireBook(db: Db, householdId: string, bookId: string) {
  const book = await get(db, 'SELECT id FROM book WHERE id = $1 AND household_id = $2', [bookId, householdId]);
  if (!book) throw new Problem(404, 'not-found');
}

/** Stores the book's picture in place of any earlier one and returns its URL. */
export async function saveCover(db: Db, householdId: string, bookId: string, image: Buffer): Promise<string> {
  await requireBook(db, householdId, bookId);
  const etag = createHash('sha256').update(image).digest('hex').slice(0, 16);
  await run(
    db,
    `INSERT INTO book_cover (book_id, image, etag, updated_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (book_id) DO UPDATE SET image = EXCLUDED.image, etag = EXCLUDED.etag, updated_at = EXCLUDED.updated_at`,
    [bookId, image, etag, new Date().toISOString()],
  );
  return coverImageUrl(bookId, etag);
}

export async function removeCover(db: Db, householdId: string, bookId: string): Promise<void> {
  await requireBook(db, householdId, bookId);
  await run(db, 'DELETE FROM book_cover WHERE book_id = $1', [bookId]);
}

/** The picture of a book in the household; another household's picture reads as absent. */
export function readCover(db: Db, householdId: string, bookId: string): Promise<BookCover | undefined> {
  return get<BookCover>(
    db,
    'SELECT bc.image, bc.etag FROM book_cover bc JOIN book b ON b.id = bc.book_id WHERE bc.book_id = $1 AND b.household_id = $2',
    [bookId, householdId],
  );
}

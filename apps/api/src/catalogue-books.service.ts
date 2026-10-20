import { createHash, randomUUID } from 'node:crypto';
import { all, get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';

/** A book in an author's catalogue, as its author sees it. */
export interface CatalogueBook {
  id: string;
  title: string;
  chapterCount: number;
  description: string;
  coverImage: string | null;
}

export interface CatalogueBookInput {
  title: string;
  chapterCount: number;
  description: string;
}

/** The author's own URL for a picture; the version changes with each new one. */
const ownCoverUrl = (bookId: string, etag: string) => `/api/catalogue-books/${bookId}/cover?v=${etag}`;

const COLUMNS = `b.id, b.title, b.chapter_count AS "chapterCount", b.description,
  CASE WHEN c.etag IS NULL THEN NULL ELSE '/api/catalogue-books/' || b.id || '/cover?v=' || c.etag END AS "coverImage"`;

/** The author's catalogue, oldest first. Every query is scoped to the author, so another author's book reads as absent (L2-170). */
export function listCatalogue(db: Db, profileId: string) {
  return all<CatalogueBook>(db, `SELECT ${COLUMNS} FROM catalogue_book b LEFT JOIN catalogue_cover c ON c.book_id = b.id WHERE b.profile_id = $1 ORDER BY b.created_at, b.id`, [profileId]);
}

async function getOwn(db: Db, profileId: string, id: string): Promise<CatalogueBook> {
  const book = await get<CatalogueBook>(db, `SELECT ${COLUMNS} FROM catalogue_book b LEFT JOIN catalogue_cover c ON c.book_id = b.id WHERE b.id = $1 AND b.profile_id = $2`, [id, profileId]);
  if (!book) throw new Problem(404, 'not-found');
  return book;
}

export async function addCatalogueBook(db: Db, profileId: string, input: CatalogueBookInput): Promise<CatalogueBook> {
  const id = randomUUID();
  await run(db, 'INSERT INTO catalogue_book (id, profile_id, title, chapter_count, description, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [
    id,
    profileId,
    input.title,
    input.chapterCount,
    input.description,
    new Date().toISOString(),
  ]);
  return getOwn(db, profileId, id);
}

/** Changes the catalogue entry only; books households already added are copies and stay as they are (ADR-0024). */
export async function updateCatalogueBook(db: Db, profileId: string, id: string, input: CatalogueBookInput): Promise<CatalogueBook> {
  const changed = await run(db, 'UPDATE catalogue_book SET title = $1, chapter_count = $2, description = $3 WHERE id = $4 AND profile_id = $5', [
    input.title,
    input.chapterCount,
    input.description,
    id,
    profileId,
  ]);
  if (!changed) throw new Problem(404, 'not-found');
  return getOwn(db, profileId, id);
}

export async function removeCatalogueBook(db: Db, profileId: string, id: string): Promise<void> {
  if (!(await run(db, 'DELETE FROM catalogue_book WHERE id = $1 AND profile_id = $2', [id, profileId]))) throw new Problem(404, 'not-found');
}

/** Stores the book's picture in place of any earlier one and returns the author's URL for it. */
export async function saveCatalogueCover(db: Db, profileId: string, id: string, image: Buffer): Promise<string> {
  await getOwn(db, profileId, id);
  const etag = createHash('sha256').update(image).digest('hex').slice(0, 16);
  await run(
    db,
    `INSERT INTO catalogue_cover (book_id, image, etag, updated_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (book_id) DO UPDATE SET image = EXCLUDED.image, etag = EXCLUDED.etag, updated_at = EXCLUDED.updated_at`,
    [id, image, etag, new Date().toISOString()],
  );
  return ownCoverUrl(id, etag);
}

export async function removeCatalogueCover(db: Db, profileId: string, id: string): Promise<void> {
  await getOwn(db, profileId, id);
  await run(db, 'DELETE FROM catalogue_cover WHERE book_id = $1', [id]);
}

/** The picture of one of the author's own books. */
export function readOwnCatalogueCover(db: Db, profileId: string, id: string) {
  return get<{ image: Buffer; etag: string }>(
    db,
    'SELECT c.image, c.etag FROM catalogue_cover c JOIN catalogue_book b ON b.id = c.book_id WHERE c.book_id = $1 AND b.profile_id = $2',
    [id, profileId],
  );
}

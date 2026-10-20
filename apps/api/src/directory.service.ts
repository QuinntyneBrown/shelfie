import { all, get, type Db } from './db.ts';

/**
 * The parent's directory: only approved authors and volunteers (ADR-0022). Pending, hidden, erased and unknown ids all
 * read as absent, so a parent learns nothing about why. Nothing here writes, so no author learns who looked (L2-171).
 */

/** A listed person's photo, served to parents from the directory's own address. */
const PHOTO = "CASE WHEN pp.etag IS NULL THEN NULL ELSE '/api/directory/photos/' || p.id || '?v=' || pp.etag END AS photo";
const LISTED = "JOIN directory_profile d ON d.profile_id = p.id AND d.status = 'approved' LEFT JOIN profile_photo pp ON pp.profile_id = p.id";

export interface AuthorRow {
  id: string;
  name: string;
  color: string;
  photo: string | null;
  bio: string;
  bookCount: number;
}

export interface VolunteerRow {
  id: string;
  name: string;
  color: string;
  photo: string | null;
  bio: string;
  ages: string;
}

export async function listDirectory(db: Db): Promise<{ authors: AuthorRow[]; volunteers: VolunteerRow[] }> {
  const authors = await all<AuthorRow>(
    db,
    `SELECT p.id, p.name, p.color, ${PHOTO}, d.bio, (SELECT COUNT(*) FROM catalogue_book b WHERE b.profile_id = p.id) AS "bookCount"
       FROM profile p ${LISTED} WHERE p.role = 'author' ORDER BY p.name, p.id`,
  );
  const volunteers = await all<VolunteerRow>(
    db,
    `SELECT p.id, p.name, p.color, ${PHOTO}, d.bio, d.ages FROM profile p ${LISTED} WHERE p.role = 'volunteer' ORDER BY p.name, p.id`,
  );
  return { authors, volunteers };
}

/** The photo of a listed author or volunteer; anyone else's reads as absent. */
export function readDirectoryPhoto(db: Db, profileId: string) {
  return get<{ image: Buffer; etag: string }>(
    db,
    "SELECT pp.image, pp.etag FROM profile_photo pp JOIN directory_profile d ON d.profile_id = pp.profile_id AND d.status = 'approved' WHERE pp.profile_id = $1",
    [profileId],
  );
}

/** A listed volunteer's profile with the contact line they wrote; Shelfie sends nothing for them (ADR-0023). */
export function getVolunteer(db: Db, id: string) {
  return get<VolunteerRow & { contact: string }>(
    db,
    `SELECT p.id, p.name, p.color, ${PHOTO}, d.bio, d.ages, d.contact FROM profile p ${LISTED} WHERE p.id = $1 AND p.role = 'volunteer'`,
    [id],
  );
}

const COVER = "CASE WHEN c.etag IS NULL THEN NULL ELSE '/api/directory/books/' || b.id || '/cover?v=' || c.etag END AS \"coverImage\"";

export interface DirectoryBook {
  id: string;
  title: string;
  chapterCount: number;
  description: string;
  coverImage: string | null;
}

/** A listed author's profile and catalogue, oldest book first; undefined for anyone else. */
export async function getAuthor(db: Db, id: string) {
  const author = await get<{ id: string; name: string; color: string; photo: string | null; bio: string; website: string | null }>(
    db,
    `SELECT p.id, p.name, p.color, ${PHOTO}, d.bio, d.website FROM profile p ${LISTED} WHERE p.id = $1 AND p.role = 'author'`,
    [id],
  );
  if (!author) return undefined;
  const books = await all<DirectoryBook>(
    db,
    `SELECT b.id, b.title, b.chapter_count AS "chapterCount", b.description, ${COVER}
       FROM catalogue_book b LEFT JOIN catalogue_cover c ON c.book_id = b.id WHERE b.profile_id = $1 ORDER BY b.created_at, b.id`,
    [id],
  );
  return { ...author, books };
}

/** A listed author's catalogue book with the author's name, as Add a book fills it in (ADR-0024). */
export function getCatalogueBook(db: Db, id: string) {
  return get<DirectoryBook & { author: string }>(
    db,
    `SELECT b.id, b.title, p.name AS author, b.chapter_count AS "chapterCount", b.description, ${COVER}
       FROM catalogue_book b JOIN profile p ON p.id = b.profile_id ${LISTED} LEFT JOIN catalogue_cover c ON c.book_id = b.id WHERE b.id = $1`,
    [id],
  );
}

/** The cover picture of a listed author's book. */
export function readCatalogueCover(db: Db, bookId: string) {
  return get<{ image: Buffer; etag: string }>(
    db,
    `SELECT c.image, c.etag FROM catalogue_cover c JOIN catalogue_book b ON b.id = c.book_id
       JOIN directory_profile d ON d.profile_id = b.profile_id AND d.status = 'approved' WHERE c.book_id = $1`,
    [bookId],
  );
}

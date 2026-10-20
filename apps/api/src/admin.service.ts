import { all, get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { hashSecret } from './secret.ts';
import { todayIn } from './streak.ts';

/** The operator's view of every household (serve-admin-data). Ids are global, so no household filter applies. */

export function listUsers(db: Db) {
  return all(db, 'SELECT id, household_id AS "householdId", role, name, email FROM profile ORDER BY household_id, role, name');
}

export function listBooks(db: Db) {
  return all(
    db,
    `SELECT b.id, b.household_id AS "householdId", b.title, (SELECT COUNT(*) FROM chapter_log c WHERE c.book_id = b.id) AS "chaptersLogged",
            b.chapter_count AS "chapterCount", b.finished_at AS "finishedAt", r.text AS reward
       FROM book b LEFT JOIN reward r ON r.book_id = b.id ORDER BY b.household_id, b.title`,
  );
}

const LOG_COLUMNS = 'c.id, c.chapter_number AS chapter, c.read_on AS "readOn", c.logged_at AS "loggedAt", c.reviewed_at AS "reviewedAt", c.sticker';

export async function listLogs(db: Db, bookId: string) {
  if (!(await get(db, 'SELECT 1 FROM book WHERE id = $1', [bookId]))) throw new Problem(404, 'not-found');
  return all(db, `SELECT ${LOG_COLUMNS} FROM chapter_log c WHERE c.book_id = $1 ORDER BY c.chapter_number`, [bookId]);
}

export async function getLog(db: Db, id: string) {
  const log = await get<Record<string, unknown>>(
    db,
    `SELECT ${LOG_COLUMNS}, c.book_id AS "bookId", b.title AS "bookTitle", c.note FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = $1`,
    [id],
  );
  if (!log) throw new Problem(404, 'not-found');
  const answers = await all(db, 'SELECT position, question_text AS question, text FROM answer WHERE chapter_log_id = $1 ORDER BY position', [id]);
  const { id: logId, bookId, bookTitle, chapter, readOn, loggedAt, reviewedAt, sticker, note } = log;
  return { id: logId, bookId, bookTitle, chapter, readOn, loggedAt, reviewedAt, sticker, note, answers };
}

export async function finishBook(db: Db, id: string) {
  const book = await get<{ id: string; title: string; finished_at: string | null }>(db, 'SELECT id, title, finished_at FROM book WHERE id = $1', [id]);
  if (!book) throw new Problem(404, 'not-found');
  if (book.finished_at) throw new Problem(400, 'book-already-finished');
  const finishedAt = new Date().toISOString();
  await run(db, 'UPDATE book SET finished_at = $1 WHERE id = $2', [finishedAt, id]);
  return { id, title: book.title, finishedAt };
}

/** The household that owns a book, so the web app's own rules can run for it. */
export async function householdOfBook(db: Db, id: string): Promise<string> {
  const book = await get<{ household_id: string }>(db, 'SELECT household_id FROM book WHERE id = $1', [id]);
  if (!book) throw new Problem(404, 'not-found');
  return book.household_id;
}

/** Moves the day a chapter was read; the streak is derived from it, so it follows. */
export async function correctLog(db: Db, id: string, readOn: string) {
  const log = await get<{ chapter_number: number; read_on: string; title: string; time_zone: string }>(
    db,
    'SELECT c.chapter_number, c.read_on, b.title, h.time_zone FROM chapter_log c JOIN book b ON b.id = c.book_id JOIN household h ON h.id = b.household_id WHERE c.id = $1',
    [id],
  );
  if (!log) throw new Problem(404, 'not-found');
  if (readOn > todayIn(log.time_zone, new Date())) throw new Problem(400, 'future-date');
  await run(db, 'UPDATE chapter_log SET read_on = $1 WHERE id = $2', [readOn, id]);
  return { id, bookTitle: log.title, chapter: log.chapter_number, previousReadOn: log.read_on, readOn };
}

/** Deletes the newest logged chapter of a book with its answers, so logged chapters never have a gap. */
export async function deleteLog(db: Db, id: string) {
  const log = await get<{ book_id: string; chapter_number: number; title: string }>(
    db,
    'SELECT c.book_id, c.chapter_number, b.title FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = $1',
    [id],
  );
  if (!log) throw new Problem(404, 'not-found');
  const { latest } = (await get<{ latest: number }>(db, 'SELECT MAX(chapter_number) AS latest FROM chapter_log WHERE book_id = $1', [log.book_id]))!;
  if (log.chapter_number !== latest) throw new Problem(400, 'log-not-latest');
  if (await get(db, 'SELECT 1 FROM reward WHERE book_id = $1', [log.book_id])) throw new Problem(400, 'book-rewarded');
  const { n } = (await get<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM answer WHERE chapter_log_id = $1', [id]))!;
  await run(db, 'DELETE FROM chapter_log WHERE id = $1', [id]);
  await run(db, 'UPDATE book SET finished_at = NULL WHERE id = $1', [log.book_id]);
  return { id, bookTitle: log.title, chapter: log.chapter_number, answersDeleted: n };
}

/** Replaces a parent's password and ends every session of that parent. Readers' credentials stay with their parents. */
export async function resetParentPassword(db: Db, id: string, password: string) {
  const profile = await get<{ name: string; role: string }>(db, 'SELECT name, role FROM profile WHERE id = $1', [id]);
  if (!profile) throw new Problem(404, 'not-found');
  if (profile.role !== 'parent') throw new Problem(400, 'not-a-parent');
  await run(db, 'UPDATE profile SET password_hash = $1 WHERE id = $2', [hashSecret(password), id]);
  const sessionsEnded = await run(db, 'DELETE FROM session WHERE profile_id = $1', [id]);
  return { id, name: profile.name, sessionsEnded };
}

/** Every author and volunteer with what they wrote, for the operator to approve or hide (ADR-0022); waiting ones first. */
export function listDirectoryProfiles(db: Db) {
  return all(
    db,
    `SELECT p.id, p.role AS kind, p.name, p.email, d.status, d.bio, d.website, d.ages, d.contact,
            (SELECT COUNT(*) FROM catalogue_book c WHERE c.profile_id = p.id) AS "bookCount"
       FROM profile p JOIN directory_profile d ON d.profile_id = p.id
      ORDER BY d.status = 'pending' DESC, p.name`,
  );
}

/** Lists or unlists an author's or volunteer's profile; parents see the change on their next load. */
export async function setProfileStatus(db: Db, id: string, status: 'approved' | 'hidden') {
  const profile = await get<{ name: string; role: string }>(db, 'SELECT name, role FROM profile WHERE id = $1', [id]);
  if (!profile) throw new Problem(404, 'not-found');
  if (profile.role !== 'author' && profile.role !== 'volunteer') throw new Problem(400, 'not-a-directory-profile');
  await run(db, 'UPDATE directory_profile SET status = $1, updated_at = $2 WHERE profile_id = $3', [status, new Date().toISOString(), id]);
  return { id, name: profile.name, kind: profile.role, status };
}

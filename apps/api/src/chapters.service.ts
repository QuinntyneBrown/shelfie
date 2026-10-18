import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { COVER_IMAGE_COLUMN } from './covers.service.ts';
import { all, get, run, transaction, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { questionsForBook } from './questions.service.ts';

const UNDO_SECONDS = 10;
const UNIQUE_VIOLATION = '23505';

const dayIn = (timeZone: string, date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);

async function householdToday(db: Db, householdId: string): Promise<string> {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  return dayIn(time_zone, new Date());
}

export interface LogRequest {
  readOn: string;
  answers: { position: number; text: string }[];
}

interface BookRow {
  id: string;
  title: string;
  author: string | null;
  chapter_count: number;
  cover_color: string;
  sticker: string;
  cover_image: string | null;
}

async function findBook(db: Db, householdId: string, bookId: string, n: number): Promise<BookRow> {
  const book = await get<BookRow>(
    db,
    `SELECT b.id, b.title, b.author, b.chapter_count, b.cover_color, b.sticker, ${COVER_IMAGE_COLUMN} AS cover_image
       FROM book b LEFT JOIN book_cover bc ON bc.book_id = b.id WHERE b.id = $1 AND b.household_id = $2`,
    [bookId, householdId],
  );
  if (!book || n > book.chapter_count) throw new Problem(404, 'not-found');
  return book;
}

async function loggedCount(db: Db, bookId: string): Promise<number> {
  return (await get<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM chapter_log WHERE book_id = $1', [bookId]))!.count;
}

async function refuseIfLogged(db: Db, bookId: string, n: number) {
  const existing = await get<{ id: string }>(db, 'SELECT id FROM chapter_log WHERE book_id = $1 AND chapter_number = $2', [bookId, n]);
  if (existing) throw new Problem(409, 'chapter-already-logged', { chapterLogId: existing.id });
}

const profileName = async (db: Db, householdId: string, role: string) =>
  (await get<{ name: string }>(db, 'SELECT name FROM profile WHERE household_id = $1 AND role = $2 ORDER BY name', [householdId, role]))?.name;

const parentName = async (db: Db, householdId: string) => (await profileName(db, householdId, 'parent'))!;
// A household need not have a reader yet, so her name falls back to something the page can still say.
const readerName = async (db: Db, householdId: string) => (await profileName(db, householdId, 'reader')) ?? 'your reader';

export async function getForm(db: Db, householdId: string, bookId: string, n: number) {
  const book = await findBook(db, householdId, bookId, n);
  await refuseIfLogged(db, bookId, n);
  return {
    book: { id: book.id, title: book.title, author: book.author, chapterCount: book.chapter_count, coverColor: book.cover_color, sticker: book.sticker, coverImage: book.cover_image },
    chapterNumber: n,
    today: await householdToday(db, householdId),
    grownUpName: await parentName(db, householdId),
    questions: (await questionsForBook(db, bookId)).map((text, i) => ({ position: i + 1, text, required: i === 0 })),
  };
}

export async function logChapter(pool: Pool, householdId: string, bookId: string, n: number, request: LogRequest) {
  const book = await findBook(pool, householdId, bookId, n);
  if (request.readOn > (await householdToday(pool, householdId))) throw new Problem(400, 'future-date');
  await refuseIfLogged(pool, bookId, n);
  if (n !== (await loggedCount(pool, bookId)) + 1) throw new Problem(409, 'chapter-out-of-order');
  const id = randomUUID();
  const loggedAt = new Date();
  const undoUntil = new Date(loggedAt.getTime() + UNDO_SECONDS * 1000);

  try {
    // The log, its answers and the finished mark commit together, so a 201 means they are all on the server.
    await transaction(pool, async (db) => {
      await run(db, 'INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ($1, $2, $3, $4, $5, $6)', [
        id,
        bookId,
        n,
        request.readOn,
        loggedAt.toISOString(),
        undoUntil.toISOString(),
      ]);
      const questions = await questionsForBook(db, bookId);
      for (const [i, question] of questions.entries()) {
        const text = request.answers.find((a) => a.position === i + 1)?.text ?? '';
        await run(db, 'INSERT INTO answer (id, chapter_log_id, position, question_text, text) VALUES ($1, $2, $3, $4, $5)', [randomUUID(), id, i + 1, question, text]);
      }
      if ((await loggedCount(db, bookId)) === book.chapter_count) {
        await run(db, 'UPDATE book SET finished_at = $1 WHERE id = $2', [loggedAt.toISOString(), bookId]);
      }
    });
  } catch (e) {
    if ((e as { code?: string }).code === UNIQUE_VIOLATION) throw new Problem(409, 'chapter-already-logged');
    throw e;
  }

  const count = await loggedCount(pool, bookId);
  return {
    chapterLogId: id,
    undoUntil: undoUntil.toISOString(),
    chaptersLogged: count,
    chapterCount: book.chapter_count,
    bookFinished: count === book.chapter_count,
  };
}

export async function undoLog(db: Db, householdId: string, chapterLogId: string) {
  const log = await get<{ id: string; book_id: string; chapter_number: number; undo_until: string }>(
    db,
    'SELECT c.id, c.book_id, c.chapter_number, c.undo_until FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = $1 AND b.household_id = $2',
    [chapterLogId, householdId],
  );
  if (!log) throw new Problem(404, 'not-found');
  if (log.undo_until < new Date().toISOString()) throw new Problem(409, 'undo-expired');
  // Only the newest chapter of a book can be undone, so the logged chapters never have a gap.
  const { latest } = (await get<{ latest: number }>(db, 'SELECT MAX(chapter_number) AS latest FROM chapter_log WHERE book_id = $1', [log.book_id]))!;
  if (log.chapter_number !== latest) throw new Problem(409, 'undo-not-latest');
  await run(db, 'DELETE FROM chapter_log WHERE id = $1', [log.id]);
  await run(db, 'UPDATE book SET finished_at = NULL WHERE id = $1', [log.book_id]);
}

export interface ChapterView {
  id: string;
  book: { id: string; title: string; coverColor: string; sticker: string; coverImage: string | null; chapterCount: number };
  chapterNumber: number;
  readOn: string;
  today: string;
  grownUpName: string;
  readerName: string;
  answers: { position: number; questionText: string; text: string }[];
  review: { sticker: string; note: string | null; reviewedAt: string; feedbackSeenAt: string | null } | null;
  nextChapterLogId: string | null;
}

export async function getChapter(db: Db, householdId: string, chapterLogId: string): Promise<ChapterView> {
  const log = await get<{
    id: string;
    chapter_number: number;
    read_on: string;
    reviewed_at: string | null;
    review_sticker: string | null;
    note: string | null;
    feedback_seen_at: string | null;
    book_id: string;
    title: string;
    cover_color: string;
    sticker: string;
    cover_image: string | null;
    chapter_count: number;
  }>(
    db,
    `SELECT c.id, c.chapter_number, c.read_on, c.reviewed_at, c.sticker AS review_sticker, c.note, c.feedback_seen_at, b.id AS book_id, b.title, b.cover_color, b.sticker, b.chapter_count,
            ${COVER_IMAGE_COLUMN} AS cover_image
       FROM chapter_log c JOIN book b ON b.id = c.book_id LEFT JOIN book_cover bc ON bc.book_id = b.id WHERE c.id = $1 AND b.household_id = $2`,
    [chapterLogId, householdId],
  );
  if (!log) throw new Problem(404, 'not-found');
  const answers = await all<ChapterView['answers'][number]>(
    db,
    'SELECT position, question_text AS "questionText", text FROM answer WHERE chapter_log_id = $1 ORDER BY position',
    [log.id],
  );
  const next = await get<{ id: string }>(db, 'SELECT id FROM chapter_log WHERE book_id = $1 AND chapter_number = $2', [log.book_id, log.chapter_number + 1]);
  return {
    id: log.id,
    book: { id: log.book_id, title: log.title, coverColor: log.cover_color, sticker: log.sticker, coverImage: log.cover_image, chapterCount: log.chapter_count },
    chapterNumber: log.chapter_number,
    readOn: log.read_on,
    today: await householdToday(db, householdId),
    grownUpName: await parentName(db, householdId),
    readerName: await readerName(db, householdId),
    answers,
    review: log.reviewed_at
      ? { sticker: log.review_sticker!, note: log.note, reviewedAt: log.reviewed_at, feedbackSeenAt: log.feedback_seen_at }
      : null,
    nextChapterLogId: next?.id ?? null,
  };
}

/** Notes that the reader has opened her feedback, so the shelf stops announcing it. */
export async function markFeedbackSeen(db: Db, householdId: string, chapterLogId: string) {
  const log = await get(db, 'SELECT c.id FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = $1 AND b.household_id = $2', [chapterLogId, householdId]);
  if (!log) throw new Problem(404, 'not-found');
  await run(db, 'UPDATE chapter_log SET feedback_seen_at = $1 WHERE id = $2 AND reviewed_at IS NOT NULL AND feedback_seen_at IS NULL', [
    new Date().toISOString(),
    chapterLogId,
  ]);
}

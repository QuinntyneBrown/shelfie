import { randomUUID } from 'node:crypto';
import { COVER_IMAGE_COLUMN } from './covers.service.ts';
import { all, get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { DEFAULT_QUESTIONS, customQuestions, type CustomQuestion } from './questions.service.ts';

export interface NewBook {
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
}

export async function createBook(db: Db, householdId: string, role: 'reader' | 'parent', book: NewBook): Promise<{ id: string }> {
  const id = randomUUID();
  await run(
    db,
    'INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [id, householdId, book.title, book.author, book.chapterCount, book.coverColor, book.sticker, role, new Date().toISOString()],
  );
  return { id };
}

export interface ChapterSummary {
  number: number;
  state: 'logged' | 'next' | 'future';
  log: { id: string; readOn: string; firstLine: string; reviewSticker: string | null } | null;
}

export interface BookResponse {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  coverImage: string | null;
  loggedCount: number;
  finishedAt: string | null;
  finishedOn: string | null;
  reward: { text: string; givenOn: string } | null;
  today: string;
  grownUpName: string;
  readerName: string;
  defaultQuestions: string[];
  questions: CustomQuestion[];
  chapters: ChapterSummary[];
}

const profileName = async (db: Db, householdId: string, role: string) =>
  (await get<{ name: string }>(db, 'SELECT name FROM profile WHERE household_id = $1 AND role = $2 ORDER BY name', [householdId, role]))?.name;

const parentName = async (db: Db, householdId: string) => (await profileName(db, householdId, 'parent'))!;
// A household need not have a reader yet, so her name falls back to something the page can still say.
const readerName = async (db: Db, householdId: string) => (await profileName(db, householdId, 'reader')) ?? 'your reader';

export async function getBook(db: Db, householdId: string, bookId: string): Promise<BookResponse> {
  const book = await get<{ id: string; title: string; author: string | null; chapter_count: number; cover_color: string; sticker: string; cover_image: string | null; finished_at: string | null }>(
    db,
    `SELECT b.id, b.title, b.author, b.chapter_count, b.cover_color, b.sticker, ${COVER_IMAGE_COLUMN} AS cover_image, b.finished_at
       FROM book b LEFT JOIN book_cover bc ON bc.book_id = b.id WHERE b.id = $1 AND b.household_id = $2`,
    [bookId, householdId],
  );
  if (!book) throw new Problem(404, 'not-found');

  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: time_zone });
  const logs = await all<{ id: string; chapter_number: number; read_on: string; review_sticker: string | null; first_answer: string | null }>(
    db,
    `SELECT c.id, c.chapter_number, c.read_on, c.sticker AS review_sticker, a.text AS first_answer
         FROM chapter_log c LEFT JOIN answer a ON a.chapter_log_id = c.id AND a.position = 1
        WHERE c.book_id = $1`,
    [bookId],
  );
  const reward = await get<{ text: string; given_at: string }>(db, 'SELECT text, given_at FROM reward WHERE book_id = $1', [bookId]);

  const byNumber = new Map(logs.map((l) => [l.chapter_number, l]));
  const nextNumber = Array.from({ length: book.chapter_count }, (_, i) => i + 1).find((n) => !byNumber.has(n));
  const chapters: ChapterSummary[] = Array.from({ length: book.chapter_count }, (_, i) => {
    const number = i + 1;
    const log = byNumber.get(number);
    return {
      number,
      state: log ? 'logged' : number === nextNumber ? 'next' : 'future',
      log: log ? { id: log.id, readOn: log.read_on, firstLine: (log.first_answer ?? '').split('\n')[0], reviewSticker: log.review_sticker } : null,
    };
  });

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    chapterCount: book.chapter_count,
    coverColor: book.cover_color,
    sticker: book.sticker,
    coverImage: book.cover_image,
    loggedCount: logs.length,
    finishedAt: book.finished_at,
    finishedOn: book.finished_at ? dayFormat.format(new Date(book.finished_at)) : null,
    reward: reward ? { text: reward.text, givenOn: dayFormat.format(new Date(reward.given_at)) } : null,
    today: dayFormat.format(new Date()),
    grownUpName: await parentName(db, householdId),
    readerName: await readerName(db, householdId),
    defaultQuestions: DEFAULT_QUESTIONS,
    questions: await customQuestions(db, bookId),
    chapters,
  };
}

export interface BookListItem {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
  coverImage: string | null;
  loggedCount: number;
  finishedOn: string | null;
  reward: { text: string } | null;
}

export interface BookList {
  readerName: string;
  books: BookListItem[];
}

export async function listBooks(db: Db, householdId: string): Promise<BookList> {
  const name = await readerName(db, householdId);
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: time_zone });
  const rows = await all<{
    id: string;
    title: string;
    author: string | null;
    chapter_count: number;
    cover_color: string;
    sticker: string;
    cover_image: string | null;
    finished_at: string | null;
    logged_count: number;
    reward_text: string | null;
  }>(
    db,
    `SELECT b.id, b.title, b.author, b.chapter_count, b.cover_color, b.sticker, ${COVER_IMAGE_COLUMN} AS cover_image, b.finished_at, b.created_at,
            (SELECT COUNT(*) FROM chapter_log c WHERE c.book_id = b.id) AS logged_count, r.text AS reward_text
       FROM book b LEFT JOIN reward r ON r.book_id = b.id LEFT JOIN book_cover bc ON bc.book_id = b.id
      WHERE b.household_id = $1 ORDER BY b.created_at DESC`,
    [householdId],
  );
  const books = rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    chapterCount: r.chapter_count,
    coverColor: r.cover_color,
    sticker: r.sticker,
    coverImage: r.cover_image,
    loggedCount: r.logged_count,
    finishedOn: r.finished_at ? dayFormat.format(new Date(r.finished_at)) : null,
    reward: r.reward_text ? { text: r.reward_text } : null,
  }));
  return { readerName: name, books };
}

export interface BookPatch {
  title?: string;
  author?: string | null;
  chapterCount?: number;
}

export async function updateBook(db: Db, householdId: string, bookId: string, patch: BookPatch): Promise<BookResponse> {
  const book = await get<{ id: string; finished_at: string | null }>(db, 'SELECT id, finished_at FROM book WHERE id = $1 AND household_id = $2', [
    bookId,
    householdId,
  ]);
  if (!book) throw new Problem(404, 'not-found');
  const { count } = (await get<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM chapter_log WHERE book_id = $1', [bookId]))!;
  if (patch.chapterCount !== undefined && patch.chapterCount < count) {
    throw new Problem(400, 'chapter-count-too-low', { errors: [{ field: 'chapterCount' }] });
  }

  await run(db, 'UPDATE book SET title = COALESCE($1, title), chapter_count = COALESCE($2, chapter_count) WHERE id = $3', [
    patch.title ?? null,
    patch.chapterCount ?? null,
    bookId,
  ]);
  if (patch.author !== undefined) await run(db, 'UPDATE book SET author = $1 WHERE id = $2', [patch.author, bookId]);
  // Adding chapters to a finished book means it is no longer finished; its reward stays.
  if (patch.chapterCount !== undefined && patch.chapterCount > count && book.finished_at) {
    await run(db, 'UPDATE book SET finished_at = NULL WHERE id = $1', [bookId]);
  }
  return getBook(db, householdId, bookId);
}

/** Deletes a book; its chapter logs, answers, questions and reward go with it through the cascades. */
export async function deleteBook(db: Db, householdId: string, bookId: string) {
  const deleted = await run(db, 'DELETE FROM book WHERE id = $1 AND household_id = $2', [bookId, householdId]);
  if (deleted === 0) throw new Problem(404, 'not-found');
}

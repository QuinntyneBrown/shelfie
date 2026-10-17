import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Problem } from './problem.ts';
import { DEFAULT_QUESTIONS, customQuestions, type CustomQuestion } from './questions.service.ts';

export interface NewBook {
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
}

export function createBook(db: DatabaseSync, householdId: string, role: 'reader' | 'grown_up', book: NewBook): { id: string } {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, householdId, book.title, book.author, book.chapterCount, book.coverColor, book.sticker, role, new Date().toISOString());
  return { id };
}

export interface ChapterSummary {
  number: number;
  state: 'logged' | 'next' | 'future';
  log: { id: string; readOn: string; firstLine: string } | null;
}

export interface BookResponse {
  id: string;
  title: string;
  author: string | null;
  chapterCount: number;
  coverColor: string;
  sticker: string;
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

export function getBook(db: DatabaseSync, householdId: string, bookId: string): BookResponse {
  const book = db
    .prepare('SELECT id, title, author, chapter_count, cover_color, sticker, finished_at FROM book WHERE id = ? AND household_id = ?')
    .get(bookId, householdId) as
    | { id: string; title: string; author: string | null; chapter_count: number; cover_color: string; sticker: string; finished_at: string | null }
    | undefined;
  if (!book) throw new Problem(404, 'not-found');

  const { time_zone } = db.prepare('SELECT time_zone FROM household WHERE id = ?').get(householdId) as { time_zone: string };
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: time_zone });
  const grownUp = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'grown_up'").get(householdId) as { name: string };
  const reader = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'reader'").get(householdId) as { name: string };
  const logs = db
    .prepare(
      `SELECT c.id, c.chapter_number, c.read_on, a.text AS first_answer
           FROM chapter_log c LEFT JOIN answer a ON a.chapter_log_id = c.id AND a.position = 1
          WHERE c.book_id = ?`,
    )
    .all(bookId) as unknown as { id: string; chapter_number: number; read_on: string; first_answer: string | null }[];
  const reward = db.prepare('SELECT text, given_at FROM reward WHERE book_id = ?').get(bookId) as { text: string; given_at: string } | undefined;

  const byNumber = new Map(logs.map((l) => [l.chapter_number, l]));
  const nextNumber = Array.from({ length: book.chapter_count }, (_, i) => i + 1).find((n) => !byNumber.has(n));
  const chapters: ChapterSummary[] = Array.from({ length: book.chapter_count }, (_, i) => {
    const number = i + 1;
    const log = byNumber.get(number);
    return {
      number,
      state: log ? 'logged' : number === nextNumber ? 'next' : 'future',
      log: log ? { id: log.id, readOn: log.read_on, firstLine: (log.first_answer ?? '').split('\n')[0] } : null,
    };
  });

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    chapterCount: book.chapter_count,
    coverColor: book.cover_color,
    sticker: book.sticker,
    loggedCount: logs.length,
    finishedAt: book.finished_at,
    finishedOn: book.finished_at ? dayFormat.format(new Date(book.finished_at)) : null,
    reward: reward ? { text: reward.text, givenOn: dayFormat.format(new Date(reward.given_at)) } : null,
    today: dayFormat.format(new Date()),
    grownUpName: grownUp.name,
    readerName: reader.name,
    defaultQuestions: DEFAULT_QUESTIONS,
    questions: customQuestions(db, bookId),
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
  loggedCount: number;
  finishedOn: string | null;
  reward: { text: string } | null;
}

export interface BookList {
  readerName: string;
  books: BookListItem[];
}

export function listBooks(db: DatabaseSync, householdId: string): BookList {
  const reader = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'reader'").get(householdId) as { name: string };
  const { time_zone } = db.prepare('SELECT time_zone FROM household WHERE id = ?').get(householdId) as { time_zone: string };
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: time_zone });
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.author, b.chapter_count, b.cover_color, b.sticker, b.finished_at, b.created_at,
              (SELECT COUNT(*) FROM chapter_log c WHERE c.book_id = b.id) AS logged_count, r.text AS reward_text
         FROM book b LEFT JOIN reward r ON r.book_id = b.id
        WHERE b.household_id = ? ORDER BY b.created_at DESC`,
    )
    .all(householdId) as unknown as {
    id: string;
    title: string;
    author: string | null;
    chapter_count: number;
    cover_color: string;
    sticker: string;
    finished_at: string | null;
    logged_count: number;
    reward_text: string | null;
  }[];
  const books = rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    chapterCount: r.chapter_count,
    coverColor: r.cover_color,
    sticker: r.sticker,
    loggedCount: r.logged_count,
    finishedOn: r.finished_at ? dayFormat.format(new Date(r.finished_at)) : null,
    reward: r.reward_text ? { text: r.reward_text } : null,
  }));
  return { readerName: reader.name, books };
}

export interface BookPatch {
  title?: string;
  author?: string | null;
  chapterCount?: number;
}

export function updateBook(db: DatabaseSync, householdId: string, bookId: string, patch: BookPatch): BookResponse {
  const book = db.prepare('SELECT id, finished_at FROM book WHERE id = ? AND household_id = ?').get(bookId, householdId) as
    | { id: string; finished_at: string | null }
    | undefined;
  if (!book) throw new Problem(404, 'not-found');
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM chapter_log WHERE book_id = ?').get(bookId) as { count: number };
  if (patch.chapterCount !== undefined && patch.chapterCount < count) {
    throw new Problem(400, 'chapter-count-too-low', { errors: [{ field: 'chapterCount' }] });
  }

  db.prepare('UPDATE book SET title = COALESCE(?, title), chapter_count = COALESCE(?, chapter_count) WHERE id = ?').run(
    patch.title ?? null,
    patch.chapterCount ?? null,
    bookId,
  );
  if (patch.author !== undefined) db.prepare('UPDATE book SET author = ? WHERE id = ?').run(patch.author, bookId);
  // Adding chapters to a finished book means it is no longer finished; its reward stays.
  if (patch.chapterCount !== undefined && patch.chapterCount > count && book.finished_at) {
    db.prepare('UPDATE book SET finished_at = NULL WHERE id = ?').run(bookId);
  }
  return getBook(db, householdId, bookId);
}

/** Deletes a book and everything that hangs off it: answers, chapter logs and its reward. */
export function deleteBook(db: DatabaseSync, householdId: string, bookId: string) {
  const book = db.prepare('SELECT id FROM book WHERE id = ? AND household_id = ?').get(bookId, householdId);
  if (!book) throw new Problem(404, 'not-found');
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM answer WHERE chapter_log_id IN (SELECT id FROM chapter_log WHERE book_id = ?)').run(bookId);
    db.prepare('DELETE FROM chapter_log WHERE book_id = ?').run(bookId);
    db.prepare('DELETE FROM reward WHERE book_id = ?').run(bookId);
    db.prepare('DELETE FROM question WHERE book_id = ?').run(bookId);
    db.prepare('DELETE FROM book WHERE id = ?').run(bookId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Problem } from './problem.ts';
import { questionsForBook } from './questions.service.ts';

const UNDO_SECONDS = 10;

const dayIn = (timeZone: string, date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);

function householdToday(db: DatabaseSync, householdId: string): string {
  const { time_zone } = db.prepare('SELECT time_zone FROM household WHERE id = ?').get(householdId) as { time_zone: string };
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
}

function findBook(db: DatabaseSync, householdId: string, bookId: string, n: number): BookRow {
  const book = db
    .prepare('SELECT id, title, author, chapter_count, cover_color, sticker FROM book WHERE id = ? AND household_id = ?')
    .get(bookId, householdId) as BookRow | undefined;
  if (!book || n > book.chapter_count) throw new Problem(404, 'not-found');
  return book;
}

function loggedCount(db: DatabaseSync, bookId: string): number {
  return (db.prepare('SELECT COUNT(*) AS count FROM chapter_log WHERE book_id = ?').get(bookId) as { count: number }).count;
}

function refuseIfLogged(db: DatabaseSync, bookId: string, n: number) {
  const existing = db.prepare('SELECT id FROM chapter_log WHERE book_id = ? AND chapter_number = ?').get(bookId, n) as { id: string } | undefined;
  if (existing) throw new Problem(409, 'chapter-already-logged', { chapterLogId: existing.id });
}

export function getForm(db: DatabaseSync, householdId: string, bookId: string, n: number) {
  const book = findBook(db, householdId, bookId, n);
  refuseIfLogged(db, bookId, n);
  const grownUp = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'grown_up'").get(householdId) as { name: string };
  return {
    book: { id: book.id, title: book.title, author: book.author, chapterCount: book.chapter_count, coverColor: book.cover_color, sticker: book.sticker },
    chapterNumber: n,
    today: householdToday(db, householdId),
    grownUpName: grownUp.name,
    questions: questionsForBook(db, bookId).map((text, i) => ({ position: i + 1, text, required: i === 0 })),
  };
}

export function logChapter(db: DatabaseSync, householdId: string, bookId: string, n: number, request: LogRequest) {
  const book = findBook(db, householdId, bookId, n);
  if (request.readOn > householdToday(db, householdId)) throw new Problem(400, 'future-date');
  refuseIfLogged(db, bookId, n);
  if (n !== loggedCount(db, bookId) + 1) throw new Problem(409, 'chapter-out-of-order');
  const id = randomUUID();
  const loggedAt = new Date();
  const undoUntil = new Date(loggedAt.getTime() + UNDO_SECONDS * 1000);

  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      bookId,
      n,
      request.readOn,
      loggedAt.toISOString(),
      undoUntil.toISOString(),
    );
    const insertAnswer = db.prepare('INSERT INTO answer (id, chapter_log_id, position, question_text, text) VALUES (?, ?, ?, ?, ?)');
    questionsForBook(db, bookId).forEach((question, i) => {
      const text = request.answers.find((a) => a.position === i + 1)?.text ?? '';
      insertAnswer.run(randomUUID(), id, i + 1, question, text);
    });
    if (loggedCount(db, bookId) === book.chapter_count) {
      db.prepare('UPDATE book SET finished_at = ? WHERE id = ?').run(loggedAt.toISOString(), bookId);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    if (e instanceof Error && e.message.includes('UNIQUE')) throw new Problem(409, 'chapter-already-logged');
    throw e;
  }

  const count = loggedCount(db, bookId);
  return {
    chapterLogId: id,
    undoUntil: undoUntil.toISOString(),
    chaptersLogged: count,
    chapterCount: book.chapter_count,
    bookFinished: count === book.chapter_count,
  };
}

export function undoLog(db: DatabaseSync, householdId: string, chapterLogId: string) {
  const log = db
    .prepare('SELECT c.id, c.book_id, c.undo_until FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = ? AND b.household_id = ?')
    .get(chapterLogId, householdId) as { id: string; book_id: string; undo_until: string } | undefined;
  if (!log) throw new Problem(404, 'not-found');
  if (log.undo_until < new Date().toISOString()) throw new Problem(409, 'undo-expired');
  db.prepare('DELETE FROM chapter_log WHERE id = ?').run(log.id);
  db.prepare('UPDATE book SET finished_at = NULL WHERE id = ?').run(log.book_id);
}

export interface ChapterView {
  id: string;
  book: { id: string; title: string; coverColor: string; sticker: string; chapterCount: number };
  chapterNumber: number;
  readOn: string;
  today: string;
  grownUpName: string;
  answers: { position: number; questionText: string; text: string }[];
  nextChapterLogId: string | null;
}

export function getChapter(db: DatabaseSync, householdId: string, chapterLogId: string): ChapterView {
  const log = db
    .prepare(
      `SELECT c.id, c.chapter_number, c.read_on, b.id AS book_id, b.title, b.cover_color, b.sticker, b.chapter_count
         FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE c.id = ? AND b.household_id = ?`,
    )
    .get(chapterLogId, householdId) as
    | { id: string; chapter_number: number; read_on: string; book_id: string; title: string; cover_color: string; sticker: string; chapter_count: number }
    | undefined;
  if (!log) throw new Problem(404, 'not-found');
  const answers = db
    .prepare('SELECT position, question_text AS questionText, text FROM answer WHERE chapter_log_id = ? ORDER BY position')
    .all(log.id) as unknown as ChapterView['answers'];
  const next = db.prepare('SELECT id FROM chapter_log WHERE book_id = ? AND chapter_number = ?').get(log.book_id, log.chapter_number + 1) as
    | { id: string }
    | undefined;
  const grownUp = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'grown_up'").get(householdId) as { name: string };
  return {
    id: log.id,
    book: { id: log.book_id, title: log.title, coverColor: log.cover_color, sticker: log.sticker, chapterCount: log.chapter_count },
    chapterNumber: log.chapter_number,
    readOn: log.read_on,
    today: householdToday(db, householdId),
    grownUpName: grownUp.name,
    answers,
    nextChapterLogId: next?.id ?? null,
  };
}

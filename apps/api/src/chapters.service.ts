import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export const DEFAULT_QUESTIONS = [
  'What happened in this chapter?',
  'Who was your favourite character in this chapter, and why?',
  'What do you think will happen next?',
];

const UNDO_SECONDS = 10;

export class Problem extends Error {
  status: number;
  type: string;

  constructor(status: number, type: string) {
    super(type);
    this.status = status;
    this.type = type;
  }
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

export function getForm(db: DatabaseSync, householdId: string, bookId: string, n: number) {
  const book = findBook(db, householdId, bookId, n);
  const grownUp = db.prepare("SELECT name FROM profile WHERE household_id = ? AND role = 'grown_up'").get(householdId) as { name: string };
  return {
    book: { id: book.id, title: book.title, author: book.author, chapterCount: book.chapter_count, coverColor: book.cover_color, sticker: book.sticker },
    chapterNumber: n,
    grownUpName: grownUp.name,
    questions: DEFAULT_QUESTIONS.map((text, i) => ({ position: i + 1, text, required: i === 0 })),
  };
}

export function logChapter(db: DatabaseSync, householdId: string, bookId: string, n: number, request: LogRequest) {
  const book = findBook(db, householdId, bookId, n);
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
    DEFAULT_QUESTIONS.forEach((question, i) => {
      const text = request.answers.find((a) => a.position === i + 1)?.text ?? '';
      insertAnswer.run(randomUUID(), id, i + 1, question, text);
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM chapter_log WHERE book_id = ?').get(bookId) as { count: number };
  return {
    chapterLogId: id,
    undoUntil: undoUntil.toISOString(),
    chaptersLogged: count,
    chapterCount: book.chapter_count,
    bookFinished: count === book.chapter_count,
  };
}

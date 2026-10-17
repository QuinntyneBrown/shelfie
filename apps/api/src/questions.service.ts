import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { Problem } from './problem.ts';

/** Every book asks these first, in this order. They are not rows, so nobody can edit or remove them. */
export const DEFAULT_QUESTIONS = [
  'What happened in this chapter?',
  'Who was your favourite character in this chapter, and why?',
  'What do you think will happen next?',
];

export interface CustomQuestion {
  id: string;
  text: string;
  createdAt: string;
}

export function customQuestions(db: DatabaseSync, bookId: string): CustomQuestion[] {
  return db
    .prepare('SELECT id, text, created_at AS createdAt FROM question WHERE book_id = ? AND removed_at IS NULL ORDER BY created_at, rowid')
    .all(bookId) as unknown as CustomQuestion[];
}

/** The questions a chapter of this book asks: the defaults, then the book's own. */
export function questionsForBook(db: DatabaseSync, bookId: string): string[] {
  return [...DEFAULT_QUESTIONS, ...customQuestions(db, bookId).map((q) => q.text)];
}

export function addQuestion(db: DatabaseSync, householdId: string, bookId: string, text: string): CustomQuestion {
  if (!db.prepare('SELECT 1 FROM book WHERE id = ? AND household_id = ?').get(bookId, householdId)) {
    throw new Problem(404, 'not-found');
  }
  const question = { id: randomUUID(), text, createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO question (id, book_id, text, created_at) VALUES (?, ?, ?, ?)').run(
    question.id,
    bookId,
    question.text,
    question.createdAt,
  );
  return question;
}

function findQuestion(db: DatabaseSync, householdId: string, questionId: string) {
  const question = db
    .prepare('SELECT q.id FROM question q JOIN book b ON b.id = q.book_id WHERE q.id = ? AND b.household_id = ? AND q.removed_at IS NULL')
    .get(questionId, householdId);
  if (!question) throw new Problem(404, 'not-found');
}

/** Earlier answers keep the wording they were written against, because each answer stores its own copy. */
export function updateQuestion(db: DatabaseSync, householdId: string, questionId: string, text: string) {
  findQuestion(db, householdId, questionId);
  db.prepare('UPDATE question SET text = ? WHERE id = ?').run(text, questionId);
}

/** Removal hides the question from later chapters; the row stays. */
export function removeQuestion(db: DatabaseSync, householdId: string, questionId: string) {
  findQuestion(db, householdId, questionId);
  db.prepare('UPDATE question SET removed_at = ? WHERE id = ?').run(new Date().toISOString(), questionId);
}

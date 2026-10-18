import { randomUUID } from 'node:crypto';
import { all, get, run, type Db } from './db.ts';
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

export function customQuestions(db: Db, bookId: string): Promise<CustomQuestion[]> {
  return all<CustomQuestion>(
    db,
    'SELECT id, text, created_at AS "createdAt" FROM question WHERE book_id = $1 AND removed_at IS NULL ORDER BY created_at, id',
    [bookId],
  );
}

/** The questions a chapter of this book asks: the defaults, then the book's own. */
export async function questionsForBook(db: Db, bookId: string): Promise<string[]> {
  return [...DEFAULT_QUESTIONS, ...(await customQuestions(db, bookId)).map((q) => q.text)];
}

export async function addQuestion(db: Db, householdId: string, bookId: string, text: string): Promise<CustomQuestion> {
  if (!(await get(db, 'SELECT 1 FROM book WHERE id = $1 AND household_id = $2', [bookId, householdId]))) {
    throw new Problem(404, 'not-found');
  }
  const question = { id: randomUUID(), text, createdAt: new Date().toISOString() };
  await run(db, 'INSERT INTO question (id, book_id, text, created_at) VALUES ($1, $2, $3, $4)', [
    question.id,
    bookId,
    question.text,
    question.createdAt,
  ]);
  return question;
}

async function findQuestion(db: Db, householdId: string, questionId: string) {
  const question = await get(
    db,
    'SELECT q.id FROM question q JOIN book b ON b.id = q.book_id WHERE q.id = $1 AND b.household_id = $2 AND q.removed_at IS NULL',
    [questionId, householdId],
  );
  if (!question) throw new Problem(404, 'not-found');
}

/** Earlier answers keep the wording they were written against, because each answer stores its own copy. */
export async function updateQuestion(db: Db, householdId: string, questionId: string, text: string) {
  await findQuestion(db, householdId, questionId);
  await run(db, 'UPDATE question SET text = $1 WHERE id = $2', [text, questionId]);
}

/** Removal hides the question from later chapters; the row stays. */
export async function removeQuestion(db: Db, householdId: string, questionId: string) {
  await findQuestion(db, householdId, questionId);
  await run(db, 'UPDATE question SET removed_at = $1 WHERE id = $2', [new Date().toISOString(), questionId]);
}

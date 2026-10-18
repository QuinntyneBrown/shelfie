import type { DatabaseSync } from 'node:sqlite';
import { Problem } from './problem.ts';

export interface Reward {
  bookId: string;
  text: string;
  note: string | null;
  givenAt: string;
}

/** One reward per finished book; a second, or one for a book still being read, is refused. */
export function giveReward(db: DatabaseSync, householdId: string, bookId: string, text: string, note: string | null): Reward {
  const book = db.prepare('SELECT finished_at FROM book WHERE id = ? AND household_id = ?').get(bookId, householdId) as
    | { finished_at: string | null }
    | undefined;
  if (!book) throw new Problem(404, 'not-found');
  if (!book.finished_at) throw new Problem(400, 'book-not-finished');
  const reward = { bookId, text, note, givenAt: new Date().toISOString() };
  try {
    db.prepare('INSERT INTO reward (book_id, text, note, given_at) VALUES (?, ?, ?, ?)').run(bookId, text, note, reward.givenAt);
  } catch (e) {
    if (e instanceof Error && e.message.includes('constraint')) throw new Problem(409, 'reward-exists');
    throw e;
  }
  return reward;
}

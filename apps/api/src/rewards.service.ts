import { get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';

export interface Reward {
  bookId: string;
  text: string;
  note: string | null;
  givenAt: string;
}

const UNIQUE_VIOLATION = '23505';

/** One reward per finished book; a second, or one for a book still being read, is refused. */
export async function giveReward(db: Db, householdId: string, bookId: string, text: string, note: string | null): Promise<Reward> {
  const book = await get<{ finished_at: string | null }>(db, 'SELECT finished_at FROM book WHERE id = $1 AND household_id = $2', [bookId, householdId]);
  if (!book) throw new Problem(404, 'not-found');
  if (!book.finished_at) throw new Problem(400, 'book-not-finished');
  const reward = { bookId, text, note, givenAt: new Date().toISOString() };
  try {
    await run(db, 'INSERT INTO reward (book_id, text, note, given_at) VALUES ($1, $2, $3, $4)', [bookId, text, note, reward.givenAt]);
  } catch (e) {
    if ((e as { code?: string }).code === UNIQUE_VIOLATION) throw new Problem(409, 'reward-exists');
    throw e;
  }
  return reward;
}

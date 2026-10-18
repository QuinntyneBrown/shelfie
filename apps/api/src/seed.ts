import type { Pool } from 'pg';
import { transaction, type Db } from './db.ts';
import { hashSecret } from './secret.ts';

export const SEED = {
  householdId: 'h1',
  readerId: 'p-nia',
  readerUsername: 'nia',
  readerPassword: 'lion-witch-7',
  parentId: 'p-dad',
  parentUsername: 'dad',
  parentEmail: 'dad@example.com',
  parentPassword: 'sunny-days-42',
};

// Hashed once per process: argon2 is deliberately slow, and the acceptance tests seed before every test.
const NIA_PASSWORD = hashSecret(SEED.readerPassword);
const DAD_PASSWORD = hashSecret(SEED.parentPassword);
const ZED_PASSWORD = hashSecret('zed-reads-4');
const ZEDS_DAD_PASSWORD = hashSecret('another-pass-99');

/** Replaces everything in the database with Nia and Dad's household, their books unless `books` is false, and a second family. */
export function seed(pool: Pool, { books = true } = {}) {
  return transaction(pool, async (db) => {
    // Every household-owned row cascades from its household; sign-in attempts belong to nobody.
    await db.query('DELETE FROM household; DELETE FROM sign_in_attempt');
    const household = (id: string) => db.query("INSERT INTO household (id, time_zone) VALUES ($1, 'UTC')", [id]);
    const profile = (...values: (string | null)[]) =>
      db.query('INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', values);
    const book = (...values: (string | number | null)[]) =>
      db.query(
        'INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at, finished_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        values,
      );
    const log = (...values: (string | number)[]) =>
      db.query('INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ($1, $2, $3, $4, $5, $6)', values);

    await household(SEED.householdId);
    await profile(SEED.readerId, SEED.householdId, 'reader', 'Nia', 'rose', SEED.readerUsername, null, NIA_PASSWORD);
    await profile(SEED.parentId, SEED.householdId, 'parent', 'Dad', 'sky', SEED.parentUsername, SEED.parentEmail, DAD_PASSWORD);

    // A second family, so tests can check that one household never sees another's data.
    await household('h2');
    await profile('p-other-reader', 'h2', 'reader', 'Zed', 'sky', 'zed', null, ZED_PASSWORD);
    await profile('p-other-dad', 'h2', 'parent', 'Zed’s dad', 'rose', 'zedsdad', 'other@example.com', ZEDS_DAD_PASSWORD);
    await book('b-other', 'h2', 'The Secret Garden', 'F. H. Burnett', 5, 'sage', '🌷', 'parent', '2026-10-01T09:00:00.000Z', null);
    await log('b-other-c1', 'b-other', 1, '2026-10-02', '2026-10-02T16:00:00.000Z', '2026-10-02T16:00:00.000Z');

    if (!books) return;

    const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
    const answer = (...values: string[]) =>
      db.query('INSERT INTO answer (id, chapter_log_id, position, question_text, text) VALUES ($1, $2, 1, $3, $4)', values);
    const logChapters = async (bookId: string, count: number, lastDay: number, firstLines: string[] = []) => {
      for (let n = 1; n <= count; n++) {
        const stamp = `${day(lastDay)}T16:00:00.000Z`;
        await log(`${bookId}-c${n}`, bookId, n, day(lastDay), stamp, stamp);
        await answer(`${bookId}-c${n}-a1`, `${bookId}-c${n}`, 'What happened in this chapter?', firstLines[n - 1] ?? `Chapter ${n} happened.`);
      }
    };

    await book('b-lion', 'h1', 'The Lion, the Witch and the Wardrobe', 'C. S. Lewis', 17, 'sage', '🦁', 'parent', `${day(1)}T09:00:00.000Z`, null);
    await logChapters('b-lion', 11, 15, [
      'Lucy found a wardrobe in the empty room and went inside.',
      'Lucy met Mr Tumnus the faun and had tea with him.',
      'Edmund followed Lucy into the wardrobe.',
      'The White Witch gave Edmund Turkish Delight.',
      'Edmund said Lucy made it all up, which was mean.',
      'All four of them went through the wardrobe into Narnia.',
      'They met Mr Beaver and had dinner at his house.',
      'Mr Beaver told them about Aslan and Edmund sneaked off.',
      'Edmund got to the Witch’s house and was locked up.',
      'Aslan came back and the snow started to melt.',
      'Father Christmas gave them presents.',
    ]);
    await book('b-robot', 'h1', 'The Wild Robot', 'Peter Brown', 80, 'mint', '🤖', 'parent', `${day(2)}T09:00:00.000Z`, null);
    await logChapters('b-robot', 3, 14);
    await book('b-bfg', 'h1', 'The BFG', 'Roald Dahl', 3, 'lilac', '🌈', 'parent', `${day(5)}T09:00:00.000Z`, null);
    await logChapters('b-bfg', 2, 12);
    await book('b-winn', 'h1', 'Because of Winn-Dixie', 'Kate DiCamillo', 12, 'sun', '🐕', 'parent', `${day(8)}T09:00:00.000Z`, null);
    await book('b-matilda', 'h1', 'Matilda', 'Roald Dahl', 3, 'rose', '📚', 'parent', `${day(3)}T09:00:00.000Z`, `${day(13)}T16:00:00.000Z`);
    await logChapters('b-matilda', 3, 13);
    await book('b-web', 'h1', 'Charlotte’s Web', 'E. B. White', 3, 'sky', '🕷️', 'parent', `${day(4)}T09:00:00.000Z`, `${day(10)}T16:00:00.000Z`);
    await logChapters('b-web', 3, 10);
    await db.query('INSERT INTO reward (book_id, text, given_at) VALUES ($1, $2, $3)', ['b-web', 'Movie night with popcorn', `${day(11)}T18:00:00.000Z`]);

    // Dad has read everything except Nia's two newest Lion chapters.
    await db.query(
      "UPDATE chapter_log SET reviewed_at = logged_at, sticker = 'star', note = 'Lovely work!', feedback_seen_at = logged_at WHERE id NOT IN ('b-lion-c10', 'b-lion-c11') AND book_id != 'b-other'",
    );
    await db.query('UPDATE chapter_log SET logged_at = $1 WHERE id = $2', [`${day(15)}T17:00:00.000Z`, 'b-lion-c11']);
  });
}

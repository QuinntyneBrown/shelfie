import type { DatabaseSync } from 'node:sqlite';
import { hashSecret } from './secret.ts';

export const SEED = {
  householdId: 'h1',
  readerId: 'p-nia',
  grownUpId: 'p-dad',
  pin: '1234',
  grownUpEmail: 'dad@example.com',
  grownUpPassword: 'sunny-days-42',
};

// Hashed once per process: argon2 is deliberately slow, and the acceptance tests seed before every test.
const NIA_PIN = hashSecret(SEED.pin);
const DAD_PASSWORD = hashSecret(SEED.grownUpPassword);
const ZED_PIN = hashSecret('4321');
const ZEDS_DAD_PASSWORD = hashSecret('another-pass-99');

/** Replaces everything in the database with Nia and Dad's household, their books unless `books` is false, and a second family. */
export function seed(db: DatabaseSync, { books = true } = {}) {
  db.exec('DELETE FROM session; DELETE FROM sign_in_attempt; DELETE FROM password_reset; DELETE FROM device; DELETE FROM answer; DELETE FROM chapter_log; DELETE FROM reward; DELETE FROM question; DELETE FROM book');
  db.prepare("INSERT OR REPLACE INTO household (id, time_zone) VALUES (?, 'UTC')").run(SEED.householdId);
  const profile = db.prepare(
    'INSERT OR REPLACE INTO profile (id, household_id, role, name, color, email, password_hash, pin_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  profile.run(SEED.readerId, SEED.householdId, 'reader', 'Nia', 'rose', null, null, NIA_PIN);
  profile.run(SEED.grownUpId, SEED.householdId, 'grown_up', 'Dad', 'sky', SEED.grownUpEmail, DAD_PASSWORD, null);

  // A second family, so tests can check that one household never sees another's data.
  db.prepare("INSERT OR REPLACE INTO household (id, time_zone) VALUES ('h2', 'UTC')").run();
  profile.run('p-other-reader', 'h2', 'reader', 'Zed', 'sky', null, null, ZED_PIN);
  profile.run('p-other-dad', 'h2', 'grown_up', 'Zed’s dad', 'rose', 'other@example.com', ZEDS_DAD_PASSWORD, null);
  db.prepare(
    "INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at, finished_at) VALUES ('b-other', 'h2', 'The Secret Garden', 'F. H. Burnett', 5, 'sage', '🌷', 'grown_up', '2026-10-01T09:00:00.000Z', NULL)",
  ).run();
  db.prepare(
    "INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ('b-other-c1', 'b-other', 1, '2026-10-02', '2026-10-02T16:00:00.000Z', '2026-10-02T16:00:00.000Z')",
  ).run();

  if (!books) return;

  const book = db.prepare(
    'INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const log = db.prepare('INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES (?, ?, ?, ?, ?, ?)');
  const reward = db.prepare('INSERT INTO reward (book_id, text, given_at) VALUES (?, ?, ?)');

  const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
  const answer = db.prepare('INSERT INTO answer (id, chapter_log_id, position, question_text, text) VALUES (?, ?, 1, ?, ?)');
  const logChapters = (bookId: string, count: number, lastDay: number, firstLines: string[] = []) => {
    for (let n = 1; n <= count; n++) {
      const stamp = `${day(lastDay)}T16:00:00.000Z`;
      log.run(`${bookId}-c${n}`, bookId, n, day(lastDay), stamp, stamp);
      answer.run(`${bookId}-c${n}-a1`, `${bookId}-c${n}`, 'What happened in this chapter?', firstLines[n - 1] ?? `Chapter ${n} happened.`);
    }
  };

  book.run('b-lion', 'h1', 'The Lion, the Witch and the Wardrobe', 'C. S. Lewis', 17, 'sage', '🦁', 'grown_up', `${day(1)}T09:00:00.000Z`, null);
  logChapters('b-lion', 11, 15, [
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
  book.run('b-robot', 'h1', 'The Wild Robot', 'Peter Brown', 80, 'mint', '🤖', 'grown_up', `${day(2)}T09:00:00.000Z`, null);
  logChapters('b-robot', 3, 14);
  book.run('b-bfg', 'h1', 'The BFG', 'Roald Dahl', 3, 'lilac', '🌈', 'grown_up', `${day(5)}T09:00:00.000Z`, null);
  logChapters('b-bfg', 2, 12);
  book.run('b-winn', 'h1', 'Because of Winn-Dixie', 'Kate DiCamillo', 12, 'sun', '🐕', 'grown_up', `${day(8)}T09:00:00.000Z`, null);
  book.run('b-matilda', 'h1', 'Matilda', 'Roald Dahl', 3, 'rose', '📚', 'grown_up', `${day(3)}T09:00:00.000Z`, `${day(13)}T16:00:00.000Z`);
  logChapters('b-matilda', 3, 13);
  book.run('b-web', 'h1', 'Charlotte’s Web', 'E. B. White', 3, 'sky', '🕷️', 'grown_up', `${day(4)}T09:00:00.000Z`, `${day(10)}T16:00:00.000Z`);
  logChapters('b-web', 3, 10);
  reward.run('b-web', 'Movie night with popcorn', `${day(11)}T18:00:00.000Z`);

  // Dad has read everything except Nia's two newest Lion chapters.
  db.exec("UPDATE chapter_log SET reviewed_at = logged_at, sticker = 'star', note = 'Lovely work!', feedback_seen_at = logged_at WHERE id NOT IN ('b-lion-c10', 'b-lion-c11') AND book_id != 'b-other'");
  db.prepare('UPDATE chapter_log SET logged_at = ? WHERE id = ?').run(`${day(15)}T17:00:00.000Z`, 'b-lion-c11');
}

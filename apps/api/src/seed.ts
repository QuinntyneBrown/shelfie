import { openDb } from './db.ts';
import { hashSecret } from './secret.ts';

export const SEED = {
  householdId: 'h1',
  readerId: 'p-nia',
  grownUpId: 'p-dad',
  pin: '1234',
  grownUpEmail: 'dad@example.com',
  grownUpPassword: 'sunny-days-42',
};

const db = openDb(process.env.SHELFIE_DB ?? 'shelfie.db');
db.exec('DELETE FROM session; DELETE FROM device; DELETE FROM answer; DELETE FROM chapter_log; DELETE FROM reward; DELETE FROM book');
db.prepare("INSERT OR REPLACE INTO household (id, time_zone) VALUES (?, 'UTC')").run(SEED.householdId);
const profile = db.prepare(
  'INSERT OR REPLACE INTO profile (id, household_id, role, name, color, email, password_hash, pin_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
);
profile.run(SEED.readerId, SEED.householdId, 'reader', 'Nia', 'rose', null, null, hashSecret(SEED.pin));
profile.run(SEED.grownUpId, SEED.householdId, 'grown_up', 'Dad', 'sky', SEED.grownUpEmail, hashSecret(SEED.grownUpPassword), null);

if (!process.argv.includes('--no-books')) {
  const book = db.prepare(
    'INSERT INTO book (id, household_id, title, author, chapter_count, cover_color, sticker, added_by_role, created_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const log = db.prepare('INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES (?, ?, ?, ?, ?, ?)');
  const reward = db.prepare('INSERT INTO reward (book_id, text, given_at) VALUES (?, ?, ?)');

  const day = (n: number) => `2026-10-${String(n).padStart(2, '0')}`;
  const logChapters = (bookId: string, count: number, lastDay: number) => {
    for (let n = 1; n <= count; n++) {
      const stamp = `${day(lastDay)}T16:00:00.000Z`;
      log.run(`${bookId}-c${n}`, bookId, n, day(lastDay), stamp, stamp);
    }
  };

  book.run('b-lion', 'h1', 'The Lion, the Witch and the Wardrobe', 'C. S. Lewis', 17, 'sage', '🦁', 'grown_up', `${day(1)}T09:00:00.000Z`, null);
  logChapters('b-lion', 11, 15);
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
}
console.log('seeded');

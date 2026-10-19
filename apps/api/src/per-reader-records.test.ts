// Traces to: L2-137, L2-138, L2-139, L2-140, L2-141, L2-142, L2-143, L2-144
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readdirSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from './app.ts';
import type { Push, PushPayload, PushTarget } from './push.ts';
import { all, get, migrate } from './db.ts';
import { addReader } from './readers.service.ts';
import { addSecondReader, seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;
const pushed: { target: PushTarget; payload: PushPayload }[] = [];
const fakePush: Push = {
  publicKey: 'BFakePublicKey',
  async send(target, payload) {
    pushed.push({ target, payload });
    return 'sent';
  },
};

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: () => {}, push: fakePush, schedule: (work) => void work() }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  await addSecondReader(db.pool);
  pushed.length = 0;
});

async function signIn(username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const dad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const nia = () => signIn(SEED.readerUsername, SEED.readerPassword);
const theo = () => signIn(SEED.secondReaderUsername, SEED.secondReaderPassword);

function call(cookie: string, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api${path}`, {
    method,
    headers: { ...APP, Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface Shelf {
  reading: { id: string; title: string }[];
  upNext: { id: string; title: string }[];
  finished: { id: string; title: string }[];
}

async function shelfTitles(cookie: string, query = '') {
  const response = await call(cookie, 'GET', `/shelf${query}`);
  assert.equal(response.status, 200);
  const shelf = (await response.json()) as Shelf;
  return [...shelf.reading, ...shelf.upNext, ...shelf.finished].map((b) => b.title).sort();
}

const NEW_BOOK = { title: 'Frog and Toad Are Friends', author: 'Arnold Lobel', chapterCount: 5, coverColor: 'mint', sticker: '🐇' };

test('Given Nia and Theo each with books, when each opens the shelf, then each sees only her own books', async () => {
  const niasShelf = await shelfTitles(await nia());
  const theosShelf = await shelfTitles(await theo());

  assert.ok(niasShelf.includes('The Lion, the Witch and the Wardrobe'));
  assert.ok(!niasShelf.includes('Dinosaurs Before Dark'));
  assert.deepEqual(theosShelf, ['Dinosaurs Before Dark']);
});

test('Given Nia is signed in, when she reaches for any part of Theo’s book, then the API answers 404 and nothing changes', async () => {
  const cookie = await nia();

  for (const [method, path, body] of [
    ['GET', '/books/b-dino'],
    ['GET', '/books/b-dino/chapters/5/form'],
    ['POST', '/books/b-dino/chapters/5', { readOn: new Date().toISOString().slice(0, 10), answers: [{ position: 1, text: 'Dinosaurs!' }] }],
    ['GET', '/chapter-logs/b-dino-c4'],
    ['POST', '/chapter-logs/b-dino-c3/seen'],
    ['DELETE', '/chapter-logs/b-dino-c4'],
    ['GET', '/books/b-dino/certificate.pdf'],
    ['GET', '/books/b-dino/cover'],
  ] as const) {
    const response = await call(cookie, method, path, body);
    assert.equal(response.status, 404, `${method} ${path}`);
  }
  assert.equal((await get<{ n: number }>(db.pool, "SELECT COUNT(*) AS n FROM chapter_log WHERE book_id = 'b-dino'"))!.n, 4);
});

test('Given Nia adds a book naming Theo, then it goes on Nia’s shelf', async () => {
  const cookie = await nia();

  const response = await call(cookie, 'POST', '/books', { ...NEW_BOOK, readerId: SEED.secondReaderId });

  assert.equal(response.status, 201);
  assert.ok((await shelfTitles(cookie)).includes('Frog and Toad Are Friends'));
  assert.ok(!(await shelfTitles(await theo())).includes('Frog and Toad Are Friends'));
});

test('Given Dad adds a book for Theo, then it is on Theo’s shelf and listed under Theo on Books, not on Nia’s', async () => {
  const cookie = await dad();

  const response = await call(cookie, 'POST', '/books', { ...NEW_BOOK, readerId: SEED.secondReaderId });

  assert.equal(response.status, 201);
  assert.deepEqual(await shelfTitles(await theo()), ['Dinosaurs Before Dark', 'Frog and Toad Are Friends']);
  assert.ok(!(await shelfTitles(await nia())).includes('Frog and Toad Are Friends'));
  const list = (await (await call(cookie, 'GET', `/books?reader=${SEED.secondReaderId}`)).json()) as { readerId: string; readerName: string; readers: { id: string; name: string }[]; books: { title: string }[] };
  assert.equal(list.readerId, SEED.secondReaderId);
  assert.equal(list.readerName, 'Theo');
  assert.deepEqual(list.readers.map((r) => r.name), ['Nia', 'Theo']);
  assert.deepEqual(list.books.map((b) => b.title).sort(), ['Dinosaurs Before Dark', 'Frog and Toad Are Friends']);
});

test('Given Dad names no reader, then Books, the shelf and a new book are about the first reader by name', async () => {
  const cookie = await dad();

  const list = (await (await call(cookie, 'GET', '/books')).json()) as { readerId: string; readerName: string; books: { title: string }[] };
  await call(cookie, 'POST', '/books', NEW_BOOK);

  assert.equal(list.readerId, SEED.readerId);
  assert.equal(list.readerName, 'Nia');
  assert.ok(!list.books.some((b) => b.title === 'Dinosaurs Before Dark'));
  assert.ok((await shelfTitles(await nia())).includes('Frog and Toad Are Friends'));
  assert.deepEqual(await shelfTitles(cookie, `?reader=${SEED.secondReaderId}`), ['Dinosaurs Before Dark']);
});

test('Given Dad names a reader of another household, or a parent, then the API answers 404 and adds nothing', async () => {
  const cookie = await dad();
  const before = (await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM book'))!.n;

  assert.equal((await call(cookie, 'POST', '/books', { ...NEW_BOOK, readerId: 'p-other-reader' })).status, 404);
  assert.equal((await call(cookie, 'POST', '/books', { ...NEW_BOOK, readerId: SEED.parentId })).status, 404);
  assert.equal((await call(cookie, 'GET', '/books?reader=p-other-reader')).status, 404);
  assert.equal((await call(cookie, 'GET', '/shelf?reader=p-other-reader')).status, 404);
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM book'))!.n, before);
});

test('Given households from before readers owned books, when the migration runs, then each book goes to its household’s first reader by name and a reader-less household’s books wait for its first reader', async () => {
  const old = await createTestDatabase({ migrated: false });
  try {
    const dir = mkdtempSync(join(tmpdir(), 'shelfie-migrations-'));
    const migrations = new URL('../migrations/', import.meta.url);
    for (const file of readdirSync(migrations).filter((f) => f < '011')) cpSync(new URL(file, migrations), join(dir, file));
    await migrate(old.pool, pathToFileURL(`${dir}/`));
    await old.pool.query(`
      INSERT INTO household (id) VALUES ('two'), ('one'), ('none');
      INSERT INTO profile (id, household_id, role, name, color, username) VALUES
        ('zoe', 'two', 'reader', 'Zoe', 'rose', 'zoe'), ('amy', 'two', 'reader', 'Amy', 'sky', 'amy'), ('mum', 'two', 'parent', 'Mum', 'sun', 'mum'),
        ('solo', 'one', 'reader', 'Solo', 'mint', 'solo'), ('pa', 'none', 'parent', 'Pa', 'sun', 'pa');
      INSERT INTO book (id, household_id, title, chapter_count, cover_color, sticker, created_at) VALUES
        ('b-two', 'two', 'Two', 3, 'sage', '🦁', '2026-10-01'), ('b-one', 'one', 'One', 3, 'sage', '🦁', '2026-10-01'), ('b-none', 'none', 'None', 3, 'sage', '🦁', '2026-10-01');
      INSERT INTO streak_reward (household_id, milestone, name, earned_at, given_at) VALUES ('two', 7, 'Ice cream', '2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z');`);

    await migrate(old.pool);

    const owners = await all<{ id: string; reader_id: string | null }>(old.pool, 'SELECT id, reader_id FROM book ORDER BY id');
    assert.deepEqual(owners, [
      { id: 'b-none', reader_id: null },
      { id: 'b-one', reader_id: 'solo' },
      { id: 'b-two', reader_id: 'amy' },
    ]);
    const earned = await all(old.pool, 'SELECT reader_id, milestone, earned_at, given_at FROM streak_reward_earned');
    assert.deepEqual(earned, [{ reader_id: 'amy', milestone: 7, earned_at: '2026-10-01T00:00:00.000Z', given_at: '2026-10-02T00:00:00.000Z' }]);

    await old.pool.query("INSERT INTO book (id, household_id, title, chapter_count, cover_color, sticker, created_at) VALUES ('b-later', 'two', 'Later', 3, 'sage', '🦁', '2026-10-03')");
    assert.equal((await get<{ reader_id: string }>(old.pool, "SELECT reader_id FROM book WHERE id = 'b-later'"))!.reader_id, 'amy');

    const added = await addReader(old.pool, 'none', { name: 'Kit', color: 'sun', username: 'kit', password: 'kitty-cat-1' });
    assert.equal((await get<{ reader_id: string }>(old.pool, "SELECT reader_id FROM book WHERE id = 'b-none'"))!.reader_id, added.id);
  } finally {
    await old.drop();
  }
});

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Rewrites Nia's logged chapters so that she read on each of the last `days` days, ending today. */
async function setNiasStreak(days: number) {
  const ids = await all<{ id: string }>(db.pool, "SELECT c.id FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.reader_id = $1 ORDER BY c.id", [SEED.readerId]);
  await db.pool.query("UPDATE chapter_log SET read_on = '2000-01-01' WHERE id = ANY($1)", [ids.map((r) => r.id)]);
  for (let i = 0; i < days; i++) await db.pool.query('UPDATE chapter_log SET read_on = $1 WHERE id = $2', [daysAgo(i), ids[i]!.id]);
}

async function shelf(cookie: string, query = '') {
  return (await (await call(cookie, 'GET', `/shelf${query}`)).json()) as {
    streak: number;
    badges: { id: string; earned: boolean }[];
    unseenFeedback: { chapterLogId: string }[];
    streakRewards: { milestone: number; earnedOn: string | null; givenOn: string | null }[];
  };
}

test('Given Nia read on each of the last 5 days and Theo only today, then each shelf shows her own streak', async () => {
  await setNiasStreak(5);

  assert.equal((await shelf(await nia())).streak, 5);
  assert.equal((await shelf(await theo())).streak, 1);
});

test('Given Nia finished books and Theo none, then Nia has the First book badge and Theo does not', async () => {
  const badge = async (cookie: string) => (await shelf(cookie)).badges.find((b) => b.id === 'first-book')!.earned;

  assert.equal(await badge(await nia()), true);
  assert.equal(await badge(await theo()), false);
});

test('Given Dad sends a sticker on Theo’s chapter, then only Theo’s shelf announces it and only Theo’s device hears', async () => {
  await db.pool.query(
    "INSERT INTO push_subscription (id, profile_id, endpoint, p256dh, auth, created_at) VALUES ('s-nia', $1, 'https://push.example.com/nia', 'k', 'a', '2026-10-19'), ('s-theo', $2, 'https://push.example.com/theo', 'k', 'a', '2026-10-19')",
    [SEED.readerId, SEED.secondReaderId],
  );

  const response = await call(await dad(), 'POST', '/chapter-logs/b-dino-c4/feedback', { sticker: 'dragon' });

  assert.equal(response.status, 200);
  assert.deepEqual((await shelf(await theo())).unseenFeedback.map((f) => f.chapterLogId), ['b-dino-c4']);
  assert.deepEqual((await shelf(await nia())).unseenFeedback, []);
  assert.deepEqual(pushed.map((p) => p.target.endpoint), ['https://push.example.com/theo']);
});

test('Given Dad gives a reward for Theo’s finished book, then only Theo’s devices hear', async () => {
  await db.pool.query("UPDATE book SET finished_at = $1 WHERE id = 'b-dino'", [new Date().toISOString()]);
  await db.pool.query(
    "INSERT INTO push_subscription (id, profile_id, endpoint, p256dh, auth, created_at) VALUES ('s-nia', $1, 'https://push.example.com/nia', 'k', 'a', '2026-10-19'), ('s-theo', $2, 'https://push.example.com/theo', 'k', 'a', '2026-10-19')",
    [SEED.readerId, SEED.secondReaderId],
  );

  assert.equal((await call(await dad(), 'POST', '/books/b-dino/reward', { text: 'A dinosaur museum trip' })).status, 201);

  assert.deepEqual(pushed.map((p) => p.target.endpoint), ['https://push.example.com/theo']);
});

test('Given a 7-day streak reward, when Nia reaches 7, then it is earned for Nia only; given to her, then Theo can still earn and be given his own', async () => {
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-rewards/7', { name: 'Ice cream' });
  await setNiasStreak(7);
  const seven = async (c: string, query = '') => (await shelf(c, query)).streakRewards.find((r) => r.milestone === 7)!;

  assert.equal((await seven(await nia())).earnedOn, today());
  assert.equal((await seven(await theo())).earnedOn, null);

  assert.equal((await call(cookie, 'POST', '/streak-rewards/7/give', { readerId: SEED.secondReaderId })).status, 400);
  assert.equal((await call(cookie, 'POST', '/streak-rewards/7/give', { readerId: SEED.readerId })).status, 200);
  assert.equal((await seven(await nia())).givenOn, today());
  assert.equal((await call(cookie, 'PUT', '/streak-rewards/7', { name: 'Two ice creams' })).status, 409);

  for (let i = 1; i < 7; i++) {
    await db.pool.query("INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ($1, 'b-dino', $2, $3, $4, $4)", [`b-dino-x${i}`, 4 + i, daysAgo(i), `${daysAgo(i)}T10:00:00.000Z`]);
  }
  assert.equal((await seven(cookie, `?reader=${SEED.secondReaderId}`)).earnedOn, today());
  assert.equal((await call(cookie, 'POST', '/streak-rewards/7/give', { readerId: SEED.secondReaderId })).status, 200);
  assert.equal((await seven(await theo())).givenOn, today());
  const rows = await all<{ reader_id: string }>(db.pool, 'SELECT reader_id FROM streak_reward_earned ORDER BY reader_id');
  assert.deepEqual(rows.map((r) => r.reader_id), [SEED.readerId, SEED.secondReaderId]);
});

interface Overview {
  readerId: string;
  readerName: string;
  readers: { id: string; name: string; waiting: number }[];
  queue: { chapterLogId: string }[];
  finishedUnrewarded: { bookId: string }[];
  activity: { bookTitle: string }[];
  thisWeek: { streak: number };
}

test('Given two readers, when Dad opens Review for Theo, then everything on it is Theo’s, names Theo, and the readers carry their waiting counts', async () => {
  await db.pool.query("UPDATE book SET finished_at = $1 WHERE id = 'b-dino'", [new Date().toISOString()]);
  const cookie = await dad();

  const theos = (await (await call(cookie, 'GET', `/review?reader=${SEED.secondReaderId}`)).json()) as Overview;
  const nias = (await (await call(cookie, 'GET', '/review')).json()) as Overview;

  assert.equal(theos.readerId, SEED.secondReaderId);
  assert.equal(theos.readerName, 'Theo');
  assert.deepEqual(theos.queue.map((q) => q.chapterLogId), ['b-dino-c4']);
  assert.deepEqual(theos.finishedUnrewarded.map((b) => b.bookId), ['b-dino']);
  assert.ok(theos.activity.every((a) => a.bookTitle === 'Dinosaurs Before Dark'));
  assert.equal(theos.thisWeek.streak, 1);
  assert.deepEqual(theos.readers.map((r) => [r.name, r.waiting]), [['Nia', 2], ['Theo', 1]]);
  assert.equal(nias.readerName, 'Nia');
  assert.deepEqual(nias.queue.map((q) => q.chapterLogId).sort(), ['b-lion-c10', 'b-lion-c11']);
  assert.ok(!nias.finishedUnrewarded.some((b) => b.bookId === 'b-dino'));
  assert.equal((await call(cookie, 'GET', '/review?reader=p-other-reader')).status, 404);
});

test('Given Theo’s book, then its page, its chapter and its certificate name Theo, with the household’s reader count', async () => {
  await db.pool.query("UPDATE book SET finished_at = $1 WHERE id = 'b-dino'", [new Date().toISOString()]);
  const cookie = await dad();

  const book = (await (await call(cookie, 'GET', '/books/b-dino')).json()) as { readerName: string; reader: { name: string }; readerCount: number };
  const chapter = (await (await call(cookie, 'GET', '/chapter-logs/b-dino-c4')).json()) as { readerName: string; reader: { name: string }; readerCount: number };
  const certificate = await call(cookie, 'GET', '/books/b-dino/certificate.pdf');

  assert.deepEqual([book.readerName, book.reader.name, book.readerCount], ['Theo', 'Theo', 2]);
  assert.deepEqual([chapter.readerName, chapter.reader.name, chapter.readerCount], ['Theo', 'Theo', 2]);
  assert.equal(certificate.status, 200);
  assert.match(certificate.headers.get('content-disposition')!, /filename="theo-dinosaurs-before-dark-certificate.pdf"/);
});

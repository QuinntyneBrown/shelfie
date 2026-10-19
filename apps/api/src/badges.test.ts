// Traces to: L2-096, L2-097, L2-098, L2-099, L2-019, L2-020
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { computeBadges } from './badges.ts';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const earnedOn = (readOnDays: string[], finishedDays: string[], id: string) =>
  computeBadges(readOnDays, finishedDays).find((badge) => badge.id === id)!.earnedOn;

test('Given nothing read, then the four badges are locked, in a fixed order, each with its icon, name and hint', () => {
  const badges = computeBadges([], []);

  assert.deepEqual(
    badges.map((b) => [b.id, b.icon, b.name, b.hint, b.earned, b.earnedOn]),
    [
      ['first-book', '📚', 'First book', 'Finish a whole book', false, null],
      ['double-chapter', '✌️', 'Double chapter', 'Read two chapters in one day', false, null],
      ['weekend-reader', '🌤️', 'Weekend reader', 'Read on a Saturday and the Sunday after', false, null],
      ['week-streak', '🔥', 'Week streak', 'Read 7 days in a row', false, null],
    ],
  );
});

test('Given finished books, then First book is earned on the earliest finished day', () => {
  assert.equal(earnedOn([], ['2026-10-13', '2026-10-10'], 'first-book'), '2026-10-10');
  assert.equal(computeBadges([], ['2026-10-10']).find((b) => b.id === 'first-book')!.earned, true);
});

test('Given two chapters on one day, then Double chapter is earned that day; one chapter on each of two days does not earn it', () => {
  assert.equal(earnedOn(['2026-10-14', '2026-10-12', '2026-10-12'], [], 'double-chapter'), '2026-10-12');
  assert.equal(earnedOn(['2026-10-14', '2026-10-13'], [], 'double-chapter'), null);
});

test('Given a Saturday and the Sunday after, then Weekend reader is earned on that Sunday; a Sunday alone, or Sunday and the Saturday after, does not earn it', () => {
  // 2026-10-10 is a Saturday.
  assert.equal(earnedOn(['2026-10-11', '2026-10-10'], [], 'weekend-reader'), '2026-10-11');
  assert.equal(earnedOn(['2026-10-11'], [], 'weekend-reader'), null);
  assert.equal(earnedOn(['2026-10-11', '2026-10-17'], [], 'weekend-reader'), null);
  assert.equal(earnedOn(['2026-10-10', '2026-10-12'], [], 'weekend-reader'), null);
});

test('Given seven days in a row, then Week streak is earned on the seventh; six days do not earn it, and an earlier break does not matter', () => {
  const seven = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
  assert.equal(earnedOn(seven, [], 'week-streak'), '2026-10-07');
  assert.equal(earnedOn(seven.slice(1), [], 'week-streak'), null);
  assert.equal(earnedOn(['2026-09-20', '2026-09-21', ...seven.slice(0, 3), ...seven.slice(3)], [], 'week-streak'), '2026-10-07');
  assert.equal(earnedOn([...seven, '2026-10-09'], [], 'week-streak'), '2026-10-07');
});

const APP = { 'X-Requested-With': 'Shelfie' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: () => {} }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(() => seed(db.pool));

async function signIn(username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

interface Badge {
  id: string;
  earned: boolean;
  earnedOn: string | null;
}

async function badgesOf(cookie: string, path: '/api/shelf' | '/api/review'): Promise<Badge[]> {
  const response = await fetch(`${url}${path}`, { headers: { ...APP, Cookie: cookie } });
  assert.equal(response.status, 200);
  return ((await response.json()) as { badges: Badge[] }).badges;
}

const summary = (badges: Badge[]) => badges.map((b) => `${b.id}:${b.earnedOn}`);

async function logOn(bookId: string, chapter: number, readOn: string) {
  await db.pool.query('INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ($1, $2, $3, $4, $5, $5)', [
    `${bookId}-extra-${chapter}`,
    bookId,
    chapter,
    readOn,
    `${readOn}T16:00:00.000Z`,
  ]);
}

test('Given the seeded household, when Nia opens her shelf, then she has First book and Double chapter from the day Charlotte’s Web was read and finished', async () => {
  const cookie = await signIn(SEED.readerUsername, SEED.readerPassword);

  assert.deepEqual(summary(await badgesOf(cookie, '/api/shelf')), [
    'first-book:2026-10-10',
    'double-chapter:2026-10-10',
    'weekend-reader:null',
    'week-streak:null',
  ]);
});

test('Given Nia also reads on the Sunday and later days, then Weekend reader and Week streak are earned and Dad sees the same badges on Review', async () => {
  await logOn('b-winn', 1, '2026-10-11');
  await logOn('b-winn', 2, '2026-10-16');
  const nia = await signIn(SEED.readerUsername, SEED.readerPassword);
  const dad = await signIn(SEED.parentUsername, SEED.parentPassword);

  const expected = ['first-book:2026-10-10', 'double-chapter:2026-10-10', 'weekend-reader:2026-10-11', 'week-streak:2026-10-16'];
  assert.deepEqual(summary(await badgesOf(nia, '/api/shelf')), expected);
  assert.deepEqual(summary(await badgesOf(dad, '/api/review')), expected);
});

test('Given a book finished late in the evening in another time zone, then First book is earned on the household’s day', async () => {
  await db.pool.query("UPDATE household SET time_zone = 'America/Toronto' WHERE id = $1", [SEED.householdId]);
  await db.pool.query("UPDATE book SET finished_at = '2026-10-11T02:30:00.000Z' WHERE id IN ('b-web', 'b-matilda')");
  const cookie = await signIn(SEED.readerUsername, SEED.readerPassword);

  assert.equal((await badgesOf(cookie, '/api/shelf')).find((b) => b.id === 'first-book')!.earnedOn, '2026-10-10');
});

test('Given Nia read on Saturday 10 Oct, when she logs a chapter read on the Sunday after, then the log result names Weekend reader as earned and carries her streak and week', async () => {
  const cookie = await signIn(SEED.readerUsername, SEED.readerPassword);
  const response = await fetch(`${url}/api/books/b-lion/chapters/12`, {
    method: 'POST',
    headers: { ...APP, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ readOn: '2026-10-11', answers: [{ position: 1, text: 'Peter met Aslan at the Stone Table.' }] }),
  });
  assert.equal(response.status, 201);
  const result = (await response.json()) as { badgesEarned: Badge[]; streak: number; week: { date: string; read: boolean; today: boolean }[] };

  assert.deepEqual(result.badgesEarned.map((b) => b.id), ['weekend-reader']);
  assert.equal(typeof result.streak, 'number');
  assert.equal(result.week.length, 7);
  assert.equal(result.week.filter((d) => d.today).length, 1);
});

test('Given Nia opens her shelf, then it carries this week, Monday to Sunday, with today marked', async () => {
  const cookie = await signIn(SEED.readerUsername, SEED.readerPassword);
  const response = await fetch(`${url}/api/shelf`, { headers: { ...APP, Cookie: cookie } });
  const shelf = (await response.json()) as { week: { date: string; read: boolean; today: boolean }[] };

  assert.equal(shelf.week.length, 7);
  assert.equal(new Date(`${shelf.week[0]!.date}T00:00:00Z`).getUTCDay(), 1);
  assert.equal(shelf.week.filter((d) => d.today).length, 1);
});

test('Given another household, then it sees only its own badges, and no session gets 401', async () => {
  const zed = await signIn('zedsdad', 'another-pass-99');

  assert.deepEqual(summary(await badgesOf(zed, '/api/shelf')), ['first-book:null', 'double-chapter:null', 'weekend-reader:null', 'week-streak:null']);
  for (const path of ['/api/shelf', '/api/review']) {
    assert.equal((await fetch(`${url}${path}`, { headers: APP })).status, 401);
  }
});

test('Given a badge, then no route can create, change or delete it', async () => {
  const dad = await signIn(SEED.parentUsername, SEED.parentPassword);

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await fetch(`${url}/api/badges`, { method, headers: { ...APP, Cookie: dad, 'Content-Type': 'application/json' }, body: method === 'DELETE' ? undefined : '{}' });
    assert.equal(response.status, 404, method);
  }
});

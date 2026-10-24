// Traces to: L2-160, L2-161, L2-162, L2-163, L2-164
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
import { mondayOf, todayIn } from './streak.ts';
import { healableDays } from './streak-healing.service.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const BROTHER = '10 minutes reading with your brother';
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;
const logged: string[] = [];

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: (line) => logged.push(JSON.stringify(line)) }).listen(0);
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

const dad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const nia = () => signIn(SEED.readerUsername, SEED.readerPassword);
const zedsDad = () => signIn('zedsdad', 'another-pass-99');

function call(cookie: string | null, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api${path}`, {
    method,
    headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function activityOf(cookie: string) {
  const response = await call(cookie, 'GET', '/streak-healing');
  assert.equal(response.status, 200);
  return ((await response.json()) as { activity: string | null }).activity;
}

test('Given no activity, when Dad sets one, then both roles read it, and an edit replaces it', async () => {
  const cookie = await dad();
  assert.equal(await activityOf(cookie), null);

  const set = await call(cookie, 'PUT', '/streak-healing/activity', { name: `  ${BROTHER}  ` });
  assert.equal(set.status, 200);
  assert.deepEqual(await set.json(), { activity: BROTHER });
  assert.equal(await activityOf(await nia()), BROTHER);

  await call(cookie, 'PUT', '/streak-healing/activity', { name: 'Read a comic with Mum' });
  assert.equal(await activityOf(cookie), 'Read a comic with Mum');
});

test('Given an empty or too long name, when it is sent, then the API answers 400 validation and stores nothing', async () => {
  const cookie = await dad();
  for (const name of ['   ', '', 'x'.repeat(101)]) {
    const response = await call(cookie, 'PUT', '/streak-healing/activity', { name });
    assert.equal(response.status, 400);
    assert.equal(((await response.json()) as { type: string }).type, 'validation');
  }
  assert.equal(await activityOf(cookie), null);
  assert.equal((await call(cookie, 'PUT', '/streak-healing/activity', { name: 'x'.repeat(100) })).status, 200);
});

test('Given an activity, when Dad removes it, then healing is off', async () => {
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });

  assert.equal((await call(cookie, 'DELETE', '/streak-healing/activity')).status, 204);
  assert.equal(await activityOf(cookie), null);
});

test('Given no session, then every streak healing route answers 401; given a reader, then changing answers 403 grown-ups-only', async () => {
  for (const [method, path] of [['GET', '/streak-healing'], ['PUT', '/streak-healing/activity'], ['DELETE', '/streak-healing/activity'], ['POST', '/streak-healing/heals']] as const) {
    assert.equal((await call(null, method, path, method === 'GET' || method === 'DELETE' ? undefined : {})).status, 401, `${method} ${path}`);
  }
  const reader = await nia();
  for (const [method, path, body] of [['PUT', '/streak-healing/activity', { name: BROTHER }], ['DELETE', '/streak-healing/activity', undefined]] as const) {
    const response = await call(reader, method, path, body);
    assert.equal(response.status, 403);
    assert.equal(((await response.json()) as { type: string }).type, 'grown-ups-only');
  }
  assert.equal(await activityOf(await dad()), null);
});

test('Given two households, then each sees and changes only its own activity, and no activity name reaches the log', async () => {
  await call(await dad(), 'PUT', '/streak-healing/activity', { name: BROTHER });
  const other = await zedsDad();
  assert.equal(await activityOf(other), null);
  await call(other, 'DELETE', '/streak-healing/activity');
  assert.equal(await activityOf(await dad()), BROTHER);
  assert.ok(!logged.some((line) => line.includes(BROTHER)));
});

/** The household day `n` days before today; the seeded households are in UTC. */
const ago = (n: number) => {
  const day = new Date(`${todayIn('UTC', new Date())}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - n);
  return day.toISOString().slice(0, 10);
};

/** Replaces the household's chapter logs with one chapter on each of these days ago. */
async function readOn(daysAgo: number[], householdId = SEED.householdId, bookId = 'b-robot') {
  await db.pool.query('DELETE FROM chapter_log WHERE book_id IN (SELECT id FROM book WHERE household_id = $1)', [householdId]);
  for (const [i, n] of daysAgo.entries()) {
    await db.pool.query('INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ($1, $2, $3, $4, $5, $5)', [
      `heal-${householdId}-${i}`,
      bookId,
      i + 1,
      ago(n),
      `${ago(n)}T16:00:00.000Z`,
    ]);
  }
}

async function review(cookie: string) {
  return (await (await call(cookie, 'GET', '/review')).json()) as {
    heal: { day: string; activity: string } | null;
    thisWeek: { chapters: number; streak: number };
    badges: { id: string; earned: boolean }[];
  };
}

const heal = (cookie: string, day: unknown) => call(cookie, 'POST', '/streak-healing/heals', { day });

async function problem(response: Response) {
  return [response.status, ((await response.json()) as { type: string }).type];
}

test('Given an activity and a missed day two days ago, when Dad heals the day Review offers, then the streak carries on across it and the card goes', async () => {
  await readOn([0, 1, 3, 4, 5]);
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });
  const before = await review(cookie);
  assert.deepEqual(before.heal, { day: ago(2), activity: BROTHER });
  assert.equal(before.thisWeek.streak, 2);

  const healed = await heal(cookie, ago(2));
  assert.equal(healed.status, 201);
  assert.deepEqual(await healed.json(), { day: ago(2), streak: 6 });

  const after = await review(cookie);
  assert.equal(after.thisWeek.streak, 6);
  assert.equal(after.thisWeek.chapters, before.thisWeek.chapters);
  const shelf = (await (await call(await nia(), 'GET', '/shelf')).json()) as { streak: number };
  assert.equal(shelf.streak, 6);
});

test('Given no activity, then Review offers no heal and a heal is refused as not-healable', async () => {
  await readOn([0, 1, 3]);
  const cookie = await dad();
  assert.equal((await review(cookie)).heal, null);
  assert.deepEqual(await problem(await heal(cookie, ago(2))), [400, 'not-healable']);
});

test('Given a day with a chapter, today, tomorrow or a day over a week ago, then the API answers not-healable; a malformed day answers validation', async () => {
  await readOn([1, 3]);
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });
  for (const day of [ago(1), ago(0), ago(-1), ago(8)]) {
    assert.deepEqual(await problem(await heal(cookie, day)), [400, 'not-healable'], day);
  }
  assert.deepEqual(await problem(await heal(cookie, 'Wednesday')), [400, 'validation']);
  assert.equal((await db.pool.query('SELECT 1 FROM streak_heal')).rowCount, 0);
  assert.equal((await heal(cookie, ago(7))).status, 201);
});

test('Given a day healed this week, when another day of the same week is sent, then the API answers already-healed-this-week', async () => {
  await readOn([0]);
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });
  const days = [1, 2, 3, 4, 5, 6, 7].map(ago);
  const week = days.filter((d) => days.filter((e) => mondayOf(e) === mondayOf(d)).length >= 2);
  assert.equal((await heal(cookie, week[0])).status, 201);

  assert.deepEqual(await problem(await heal(cookie, week[1])), [409, 'already-healed-this-week']);
  assert.deepEqual(await problem(await heal(cookie, week[0])), [409, 'already-healed-this-week']);
  assert.equal((await db.pool.query('SELECT 1 FROM streak_heal')).rowCount, 1);
});

test('Given a heal on Sunday, then Monday of the next week is still healable, and the healed week is not', () => {
  // 2026-10-20 is a Tuesday; 2026-10-18 is the Sunday before it.
  const heals = [{ day: '2026-10-18', activity: BROTHER }];
  assert.deepEqual(healableDays(['2026-10-15'], heals, '2026-10-20'), ['2026-10-19']);
  assert.deepEqual(healableDays(['2026-10-19', '2026-10-15'], [], '2026-10-20'), ['2026-10-18', '2026-10-17', '2026-10-16', '2026-10-14', '2026-10-13']);
});

test('Given a healed day, when a chapter is later logged for it or the activity is removed, then the streak stays as it was', async () => {
  await readOn([0, 1, 3, 4]);
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });
  await heal(cookie, ago(2));
  assert.equal((await review(cookie)).thisWeek.streak, 5);

  await db.pool.query("INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ('late', 'b-robot', 9, $1, $2, $2)", [ago(2), new Date().toISOString()]);
  assert.equal((await review(cookie)).thisWeek.streak, 5);

  await call(cookie, 'DELETE', '/streak-healing/activity');
  assert.equal((await review(cookie)).thisWeek.streak, 5);
});

test('Given six read days and one healed day in a row, then the streak is 7 but the Week streak badge is not earned', async () => {
  await readOn([0, 1, 2, 4, 5, 6]);
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });
  await heal(cookie, ago(3));

  const overview = await review(cookie);
  assert.equal(overview.thisWeek.streak, 7);
  assert.equal(overview.badges.find((b) => b.id === 'week-streak')!.earned, false);
});

test('Given a healed day this week, then the shelf week marks it healed and the chapter success card week does not', async () => {
  await readOn([0]);
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });
  const thisWeek = [1, 2, 3, 4, 5, 6].map(ago).find((d) => mondayOf(d) === mondayOf(ago(0)));
  if (!thisWeek) return; // Today is Monday: no earlier day this week to heal.
  assert.equal((await heal(cookie, thisWeek)).status, 201);

  const shelf = (await (await call(await nia(), 'GET', '/shelf')).json()) as { week: { date: string; healed: string | null }[] };
  assert.equal(shelf.week.find((d) => d.date === thisWeek)!.healed, BROTHER);
  const logged = await call(await nia(), 'POST', '/books/b-robot/chapters/2', { readOn: ago(0), answers: [{ position: 1, text: 'The robot woke up.' }] });
  assert.equal(logged.status, 201);
  const result = (await logged.json()) as { week: { date: string; read: boolean; healed: string | null }[] };
  assert.deepEqual(result.week.find((d) => d.date === thisWeek), { date: thisWeek, read: false, healed: null, today: false });
});

test('Given a reader, then a heal answers 403 grown-ups-only; given two households, then a heal changes only its own streak and week', async () => {
  await readOn([0, 2]);
  await readOn([0, 2], 'h2', 'b-other');
  const cookie = await dad();
  await call(cookie, 'PUT', '/streak-healing/activity', { name: BROTHER });
  assert.deepEqual(await problem(await heal(await nia(), ago(1))), [403, 'grown-ups-only']);

  assert.equal((await heal(cookie, ago(1))).status, 201);
  const other = await zedsDad();
  assert.equal((await review(other)).thisWeek.streak, 1);
  await call(other, 'PUT', '/streak-healing/activity', { name: 'Read to the dog' });
  assert.equal((await heal(other, ago(1))).status, 201);
  assert.equal((await review(other)).thisWeek.streak, 3);
  assert.ok(!logged.some((line) => line.includes(BROTHER) || line.includes('Read to the dog')));
});

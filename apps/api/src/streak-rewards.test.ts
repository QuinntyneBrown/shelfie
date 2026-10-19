// Traces to: L2-100, L2-101, L2-102, L2-103, L2-104
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
import { todayIn } from './streak.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
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
  return fetch(`${url}/api/streak-rewards${path}`, {
    method,
    headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface StreakReward {
  milestone: number;
  name: string | null;
  earnedOn: string | null;
  givenOn: string | null;
}

async function rewards(cookie: string): Promise<StreakReward[]> {
  const response = await call(cookie, 'GET', '');
  assert.equal(response.status, 200);
  return ((await response.json()) as { rewards: StreakReward[] }).rewards;
}

const TODAY = () => todayIn('UTC', new Date());

/** Makes the household's streak exactly this many days, ending today, by replacing its chapter logs. */
async function setStreak(days: number) {
  await db.pool.query("DELETE FROM chapter_log WHERE book_id IN (SELECT id FROM book WHERE household_id = $1)", [SEED.householdId]);
  for (let i = 0; i < days; i++) {
    const day = new Date(`${TODAY()}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - i);
    const readOn = day.toISOString().slice(0, 10);
    await db.pool.query('INSERT INTO chapter_log (id, book_id, chapter_number, read_on, logged_at, undo_until) VALUES ($1, $2, $3, $4, $5, $5)', [
      `streak-${i}`,
      'b-robot',
      i + 1,
      readOn,
      `${readOn}T16:00:00.000Z`,
    ]);
  }
}

test('Given no rewards are set, then the three milestones are listed with no name for Dad and for Nia', async () => {
  const unset = [7, 30, 100].map((milestone) => ({ milestone, name: null, earnedOn: null, givenOn: null }));

  assert.deepEqual(await rewards(await dad()), unset);
  assert.deepEqual(await rewards(await nia()), unset);
});

test('Given Dad, when he sets the 7-day reward, then the name is trimmed and stored, and it is listed for Nia', async () => {
  await setStreak(0);
  const cookie = await dad();

  const response = await call(cookie, 'PUT', '/7', { name: '  Ice cream ' });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { milestone: 7, name: 'Ice cream', earnedOn: null, givenOn: null });
  assert.equal((await rewards(await nia())).find((r) => r.milestone === 7)!.name, 'Ice cream');
});

test('Given a name that is empty or over 100 characters, then the API answers 400 and stores nothing; given a milestone that is not 7, 30 or 100, then 404', async () => {
  const cookie = await dad();

  for (const body of [{ name: '   ' }, { name: 'x'.repeat(101) }, {}, { name: 7 }]) {
    const response = await call(cookie, 'PUT', '/7', body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(((await response.json()) as { type: string }).type, 'validation');
  }
  assert.equal((await call(cookie, 'PUT', '/7', { name: 'x'.repeat(100) })).status, 200);
  for (const milestone of ['8', '0', 'abc', '70']) {
    assert.equal((await call(cookie, 'PUT', `/${milestone}`, { name: 'Ice cream' })).status, 404, milestone);
  }
  assert.deepEqual(
    (await rewards(cookie)).map((r) => r.name),
    ['x'.repeat(100), null, null],
  );
});

test('Given Nia, when she tries to set, remove or give a reward, then the API answers 403 and nothing changes', async () => {
  await db.pool.query("INSERT INTO streak_reward (household_id, milestone, name, earned_at) VALUES ($1, 7, 'Ice cream', '2026-10-01T00:00:00.000Z')", [SEED.householdId]);
  const cookie = await nia();

  for (const [method, path, body] of [
    ['PUT', '/7', { name: 'Pony' }],
    ['DELETE', '/7', undefined],
    ['POST', '/7/give', undefined],
  ] as const) {
    const response = await call(cookie, method, path, body);
    assert.equal(response.status, 403, method);
    assert.equal(((await response.json()) as { type: string }).type, 'grown-ups-only');
  }
  const [seven] = await rewards(cookie);
  assert.deepEqual(seven, { milestone: 7, name: 'Ice cream', earnedOn: '2026-10-01', givenOn: null });
});

test('Given no session, when any streak reward route is requested, then the API answers 401', async () => {
  for (const [method, path] of [
    ['GET', ''],
    ['PUT', '/7'],
    ['DELETE', '/7'],
    ['POST', '/7/give'],
  ]) {
    assert.equal((await call(null, method, path, method === 'PUT' ? { name: 'x' } : undefined)).status, 401, `${method} ${path}`);
  }
});

test('Given a streak of 6, when it becomes 7 and a read happens, then the 7-day reward is earned that day; it stays earned after the streak breaks', async () => {
  await setStreak(6);
  const cookie = await dad();
  await call(cookie, 'PUT', '/7', { name: 'Ice cream' });
  assert.equal((await rewards(cookie))[0]!.earnedOn, null);

  await setStreak(7);
  assert.equal((await rewards(cookie))[0]!.earnedOn, TODAY());

  await setStreak(0);
  assert.equal((await rewards(cookie))[0]!.earnedOn, TODAY());
});

test('Given a streak of 9 when Dad sets the 7-day reward, then it is earned at once; reading on changes nothing', async () => {
  await setStreak(9);
  const cookie = await dad();

  const response = await call(cookie, 'PUT', '/7', { name: 'Ice cream' });

  assert.equal(((await response.json()) as StreakReward).earnedOn, TODAY());
  await db.pool.query("UPDATE streak_reward SET earned_at = '2026-10-01T10:00:00.000Z'");
  await setStreak(10);
  assert.equal((await rewards(cookie))[0]!.earnedOn, '2026-10-01');
});

test('Given a milestone passed with no reward, when Dad sets it while the streak is still above it, then it is earned; when the streak is below it, then it is not', async () => {
  await setStreak(30);
  const cookie = await dad();
  assert.equal(((await (await call(cookie, 'PUT', '/30', { name: 'Pizza night' })).json()) as StreakReward).earnedOn, TODAY());

  await setStreak(5);
  await call(cookie, 'DELETE', '/30');
  assert.equal(((await (await call(cookie, 'PUT', '/30', { name: 'Pizza night' })).json()) as StreakReward).earnedOn, null);
});

test('Given an earned reward, when Dad gives it, then it is given today; giving again, editing or removing it answers 409; giving one that is not earned answers 400', async () => {
  await setStreak(7);
  const cookie = await dad();
  await call(cookie, 'PUT', '/7', { name: 'Ice cream' });
  await call(cookie, 'PUT', '/30', { name: 'Pizza night' });

  const notEarned = await call(cookie, 'POST', '/30/give');
  assert.equal(notEarned.status, 400);
  assert.equal(((await notEarned.json()) as { type: string }).type, 'not-earned');

  const given = await call(cookie, 'POST', '/7/give');
  assert.equal(given.status, 200);
  assert.deepEqual(await given.json(), { milestone: 7, name: 'Ice cream', earnedOn: TODAY(), givenOn: TODAY() });

  for (const [method, path, body] of [
    ['POST', '/7/give', undefined],
    ['PUT', '/7', { name: 'Changed' }],
    ['DELETE', '/7', undefined],
  ] as const) {
    const response = await call(cookie, method, path, body);
    assert.equal(response.status, 409, method);
    assert.equal(((await response.json()) as { type: string }).type, 'already-given');
  }
  assert.equal((await rewards(cookie))[0]!.name, 'Ice cream');
  assert.equal((await call(cookie, 'POST', '/100/give')).status, 404);
});

test('Given a reward that is set, when Dad removes it, then it is unset; removing it again answers 404', async () => {
  const cookie = await dad();
  await call(cookie, 'PUT', '/30', { name: 'Pizza night' });

  assert.equal((await call(cookie, 'DELETE', '/30')).status, 204);
  assert.equal((await rewards(cookie))[1]!.name, null);
  assert.equal((await call(cookie, 'DELETE', '/30')).status, 404);
});

test('Given a streak of 7, then the shelf and Review answer with the rewards, earned', async () => {
  await setStreak(7);
  const dadCookie = await dad();
  await call(dadCookie, 'PUT', '/7', { name: 'Ice cream' });
  const niaCookie = await nia();

  for (const [cookie, path] of [
    [niaCookie, '/api/shelf'],
    [dadCookie, '/api/review'],
  ] as const) {
    const response = await fetch(`${url}${path}`, { headers: { ...APP, Cookie: cookie } });
    const body = (await response.json()) as { streakRewards: StreakReward[] };
    assert.deepEqual(body.streakRewards[0], { milestone: 7, name: 'Ice cream', earnedOn: TODAY(), givenOn: null }, path);
    assert.equal(body.streakRewards.length, 3);
  }
});

test('Given two households, then each sees and changes only its own, and one earning a milestone does not earn the other’s', async () => {
  await setStreak(7);
  const cookie = await dad();
  await call(cookie, 'PUT', '/7', { name: 'Ice cream' });
  const zed = await zedsDad();
  await call(zed, 'PUT', '/7', { name: 'Kite' });

  assert.equal((await rewards(cookie))[0]!.name, 'Ice cream');
  assert.deepEqual((await rewards(zed))[0], { milestone: 7, name: 'Kite', earnedOn: null, givenOn: null });
  assert.equal((await call(zed, 'POST', '/7/give')).status, 400);
  assert.equal((await rewards(cookie))[0]!.givenOn, null);
});

test('Given any streak reward request, then the log never contains the reward’s name', async () => {
  await setStreak(7);
  const cookie = await dad();
  logged.length = 0;

  await call(cookie, 'PUT', '/7', { name: 'Secret sleepover' });
  await call(cookie, 'POST', '/7/give');
  await rewards(cookie);

  assert.ok(logged.length >= 3);
  assert.ok(logged.every((line) => !line.includes('Secret sleepover')));
});

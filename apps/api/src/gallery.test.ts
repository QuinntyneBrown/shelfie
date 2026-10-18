// Traces to: L2-081, L2-082, L2-083, L2-084, L2-085, L2-087, L2-088, L2-089
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
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
  return fetch(`${url}/api/gallery-rewards${path}`, {
    method,
    headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface Gallery {
  rewards: { id: string; name: string; target: number }[];
  goal: { rewardId: string; name: string; target: number; finished: number; reached: boolean; bookId: string | null } | null;
}

async function gallery(cookie: string): Promise<Gallery> {
  const response = await call(cookie, 'GET', '');
  assert.equal(response.status, 200);
  return (await response.json()) as Gallery;
}

async function add(cookie: string, name: string, target: number) {
  const response = await call(cookie, 'POST', '', { name, target });
  assert.equal(response.status, 201);
  return (await response.json()) as { id: string; name: string; target: number };
}

test('Given Dad, when he adds a reward to the gallery, then it is created and listed for him and for Nia', async () => {
  const cookie = await dad();

  const response = await call(cookie, 'POST', '', { name: '  Trip to the zoo ', target: 3 });

  assert.equal(response.status, 201);
  const created = (await response.json()) as { id: string; name: string; target: number };
  assert.deepEqual({ name: created.name, target: created.target }, { name: 'Trip to the zoo', target: 3 });
  assert.deepEqual((await gallery(cookie)).rewards, [created]);
  assert.deepEqual(await gallery(await nia()), { rewards: [created], goal: null });
});

test('Given a name that is empty or over 100 characters, or a target that is not a whole number from 1 to 20, then the API answers 400 and stores nothing', async () => {
  const cookie = await dad();
  const invalid = [
    { name: '   ', target: 3 },
    { name: 'x'.repeat(101), target: 3 },
    { name: 'Trip to the zoo', target: 0 },
    { name: 'Trip to the zoo', target: 21 },
    { name: 'Trip to the zoo', target: 2.5 },
    { name: 'Trip to the zoo', target: '3' },
    { name: 'Trip to the zoo' },
  ];

  for (const body of invalid) {
    const response = await call(cookie, 'POST', '', body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(((await response.json()) as { type: string }).type, 'validation');
  }
  assert.equal((await add(cookie, 'x'.repeat(100), 20)).target, 20);
  assert.equal((await gallery(cookie)).rewards.length, 1);
});

test('Given Nia, when she tries to add a reward, then the API answers 403 and nothing is stored', async () => {
  const cookie = await nia();

  const response = await call(cookie, 'POST', '', { name: 'Pony', target: 1 });

  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { type: string }).type, 'grown-ups-only');
  assert.deepEqual((await gallery(cookie)).rewards, []);
});

test('Given no session, when the gallery is read or changed, then the API answers 401', async () => {
  assert.equal((await call(null, 'GET', '')).status, 401);
  assert.equal((await call(null, 'POST', '', { name: 'Pony', target: 1 })).status, 401);
});

test('Given rewards in two households, when each reads the gallery, then it sees only its own', async () => {
  await add(await dad(), 'Trip to the zoo', 3);
  const theirs = await add(await zedsDad(), 'Kite', 2);

  assert.deepEqual((await gallery(await zedsDad())).rewards, [theirs]);
  assert.deepEqual(
    (await gallery(await nia())).rewards.map((r) => r.name),
    ['Trip to the zoo'],
  );
});

test('Given gallery requests, then the log never holds a reward name', async () => {
  const cookie = await dad();
  logged.length = 0;

  await add(cookie, 'Secret sleepover', 2);
  await gallery(cookie);

  assert.ok(logged.length >= 2);
  assert.ok(logged.every((line) => !line.includes('Secret sleepover')));
});

test('Given a gallery reward, when Dad edits it, then the gallery shows the new name and target; invalid values are refused', async () => {
  const cookie = await dad();
  const { id } = await add(cookie, 'Trip to the zoo', 3);

  const response = await call(cookie, 'PATCH', `/${id}`, { name: 'Trip to the aquarium', target: 4 });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id, name: 'Trip to the aquarium', target: 4 });
  assert.equal((await call(cookie, 'PATCH', `/${id}`, { name: '', target: 4 })).status, 400);
  assert.equal((await call(cookie, 'PATCH', `/${id}`, { name: 'Zoo', target: 21 })).status, 400);
  assert.deepEqual((await gallery(cookie)).rewards, [{ id, name: 'Trip to the aquarium', target: 4 }]);
});

test('Given a gallery reward, when Dad removes it, then it leaves the gallery', async () => {
  const cookie = await dad();
  const { id } = await add(cookie, 'Trip to the zoo', 3);
  const kept = await add(cookie, 'New art set', 2);

  const response = await call(cookie, 'DELETE', `/${id}`);

  assert.equal(response.status, 204);
  assert.deepEqual((await gallery(cookie)).rewards, [kept]);
});

test('Given Nia, when she edits or removes a gallery reward, then the API answers 403 and nothing changes', async () => {
  const reward = await add(await dad(), 'Trip to the zoo', 3);
  const cookie = await nia();

  assert.equal((await call(cookie, 'PATCH', `/${reward.id}`, { name: 'Pony', target: 1 })).status, 403);
  assert.equal((await call(cookie, 'DELETE', `/${reward.id}`)).status, 403);
  assert.deepEqual((await gallery(cookie)).rewards, [reward]);
});

test('Given a gallery reward of another household, or an unknown id, when it is edited or removed, then the API answers 404 and nothing changes', async () => {
  const reward = await add(await dad(), 'Trip to the zoo', 3);
  const cookie = await zedsDad();

  assert.equal((await call(cookie, 'PATCH', `/${reward.id}`, { name: 'Mine now', target: 1 })).status, 404);
  assert.equal((await call(cookie, 'DELETE', `/${reward.id}`)).status, 404);
  assert.equal((await call(await dad(), 'DELETE', '/no-such-reward')).status, 404);
  assert.deepEqual((await gallery(await dad())).rewards, [reward]);
});

let finishes = 0;
/** Marks a book of Nia's finished now, as logging its last chapter does; each one a millisecond after the last. */
const finish = (bookId: string) => db.pool.query('UPDATE book SET finished_at = $1 WHERE id = $2', [new Date(Date.now() + ++finishes).toISOString(), bookId]);

async function pick(cookie: string, id: string) {
  const response = await call(cookie, 'POST', `/${id}/pick`);
  assert.equal(response.status, 200);
  return (await response.json()) as Gallery;
}

test('Given the gallery, when Nia picks a reward, then it is her goal at 0 of its target; books finished earlier do not count', async () => {
  const zoo = await add(await dad(), 'Trip to the zoo', 3);

  const picked = await pick(await nia(), zoo.id);

  assert.deepEqual(picked.goal, { rewardId: zoo.id, name: 'Trip to the zoo', target: 3, finished: 0, reached: false, bookId: null });
  assert.deepEqual((await gallery(await dad())).goal, picked.goal);
});

test('Given a goal, when Nia finishes books, then each one counts; picking another reward starts again at 0', async () => {
  const zoo = await add(await dad(), 'Trip to the zoo', 3);
  const art = await add(await dad(), 'New art set', 2);
  const cookie = await nia();
  await pick(cookie, zoo.id);

  await finish('b-bfg');
  assert.equal((await gallery(cookie)).goal?.finished, 1);

  const switched = await pick(cookie, art.id);
  assert.deepEqual(switched.goal, { rewardId: art.id, name: 'New art set', target: 2, finished: 0, reached: false, bookId: null });
  await finish('b-robot');
  assert.equal((await gallery(cookie)).goal?.finished, 1);
});

test('Given a goal of 2 books, when Nia finishes 3, then it is reached at 2 of 2 and names the book that reached it', async () => {
  const art = await add(await dad(), 'New art set', 2);
  const cookie = await nia();
  await pick(cookie, art.id);

  await finish('b-bfg');
  await finish('b-robot');
  await finish('b-lion');

  const { goal } = await gallery(cookie);
  assert.deepEqual(goal, { rewardId: art.id, name: 'New art set', target: 2, finished: 2, reached: true, bookId: 'b-robot' });
});

test('Given a reached goal, when its book is given a reward through the usual flow, then the goal is complete and none is shown', async () => {
  const kite = await add(await dad(), 'Kite day', 1);
  await pick(await nia(), kite.id);
  await finish('b-bfg');
  const cookie = await dad();

  const given = await fetch(`${url}/api/books/b-bfg/reward`, {
    method: 'POST',
    headers: { ...APP, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Kite day' }),
  });

  assert.equal(given.status, 201);
  assert.equal((await gallery(cookie)).goal, null);
});

test('Given a goal, when Dad lowers its target or removes it, then the goal follows at once', async () => {
  const zoo = await add(await dad(), 'Trip to the zoo', 3);
  await pick(await nia(), zoo.id);
  await finish('b-bfg');
  const cookie = await dad();

  await call(cookie, 'PATCH', `/${zoo.id}`, { name: 'Trip to the zoo', target: 1 });
  assert.equal((await gallery(cookie)).goal?.reached, true);

  await call(cookie, 'DELETE', `/${zoo.id}`);
  assert.equal((await gallery(cookie)).goal, null);
});

test('Given a reward of another household, or an unknown id, when it is picked, then the API answers 404 and no goal changes', async () => {
  const zoo = await add(await dad(), 'Trip to the zoo', 3);

  assert.equal((await call(await zedsDad(), 'POST', `/${zoo.id}/pick`)).status, 404);
  assert.equal((await call(await nia(), 'POST', '/no-such-reward/pick')).status, 404);
  assert.equal((await gallery(await dad())).goal, null);
});

test('Given a reached goal, when Dad opens Review, then the overview names the goal and its book', async () => {
  const kite = await add(await dad(), 'Kite day', 1);
  await pick(await nia(), kite.id);
  await finish('b-bfg');

  const review = await fetch(`${url}/api/review`, { headers: { Cookie: await dad() } });

  assert.equal(review.status, 200);
  const { goal } = (await review.json()) as Gallery;
  assert.deepEqual(goal, { rewardId: kite.id, name: 'Kite day', target: 1, finished: 1, reached: true, bookId: 'b-bfg' });
});

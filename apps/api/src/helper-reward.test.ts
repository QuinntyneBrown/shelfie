// Traces to: L2-138, L2-141, L2-142, L2-146
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { addZoe, seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: () => {}, push: null }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  await addZoe(db.pool);
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

const nia = () => signIn(SEED.readerUsername, SEED.readerPassword);
const dad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const zedsDad = () => signIn('zedsdad', 'another-pass-99');

function call(cookie: string, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api${path}`, {
    method,
    headers: { ...APP, Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface HelperReward {
  name: string;
  targetMinutes: number;
  minutes: Record<string, number>;
  earnedBy: { id: string; name: string } | null;
  givenOn: string | null;
}

async function reward(cookie: string): Promise<HelperReward | null> {
  const response = await call(cookie, 'GET', '/helper-reward');
  assert.equal(response.status, 200);
  return ((await response.json()) as { reward: HelperReward | null }).reward;
}

test('Given no helper reward, then it reads as none for Dad and for Nia', async () => {
  assert.equal(await reward(await dad()), null);
  assert.equal(await reward(await nia()), null);
});

test('Given Dad, when he sets Cinema trip at 120 minutes, then the name is trimmed and stored and Nia reads it with no minutes yet', async () => {
  const response = await call(await dad(), 'PUT', '/helper-reward', { name: '  Cinema trip ', targetMinutes: 120 });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { name: 'Cinema trip', targetMinutes: 120, minutes: {}, earnedBy: null, givenOn: null });
  assert.deepEqual(await reward(await nia()), { name: 'Cinema trip', targetMinutes: 120, minutes: {}, earnedBy: null, givenOn: null });
});

test('Given Dad changes the reward, then the new name and minutes replace the old', async () => {
  const cookie = await dad();
  await call(cookie, 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 120 });

  await call(cookie, 'PUT', '/helper-reward', { name: 'Bowling', targetMinutes: 150 });

  const set = (await reward(cookie))!;
  assert.deepEqual([set.name, set.targetMinutes], ['Bowling', 150]);
});

test('Given an empty or long name, or minutes outside 30 to 600, then the API answers 400 and stores nothing', async () => {
  const cookie = await dad();
  for (const body of [{ name: ' ', targetMinutes: 120 }, { name: 'x'.repeat(101), targetMinutes: 120 }, { name: 'Sweets', targetMinutes: 29 }, { name: 'Sweets', targetMinutes: 601 }, { name: 'Sweets', targetMinutes: 60.5 }, { name: 'Sweets' }]) {
    const response = await call(cookie, 'PUT', '/helper-reward', body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(((await response.json()) as { type: string }).type, 'validation');
  }
  assert.equal(await reward(cookie), null);
  assert.equal((await call(cookie, 'PUT', '/helper-reward', { name: 'Sweets', targetMinutes: 30 })).status, 200);
  assert.equal((await call(cookie, 'PUT', '/helper-reward', { name: 'Sweets', targetMinutes: 600 })).status, 200);
});

test('Given a reader, when she sets the reward, then the API answers 403 grown-ups-only', async () => {
  const response = await call(await nia(), 'PUT', '/helper-reward', { name: 'Sweets', targetMinutes: 30 });

  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { type: string }).type, 'grown-ups-only');
});

test('Given Dad’s helper reward, then another household never sees it', async () => {
  await call(await dad(), 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 120 });

  assert.equal(await reward(await zedsDad()), null);
});

test('Given no session cookie, then the API answers 401', async () => {
  assert.equal((await fetch(`${url}/api/helper-reward`, { headers: APP })).status, 401);
});

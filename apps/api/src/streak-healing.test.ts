// Traces to: L2-160, L2-161, L2-162, L2-163, L2-164
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
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

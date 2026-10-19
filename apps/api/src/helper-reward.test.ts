// Traces to: L2-138, L2-141, L2-142, L2-146
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { addZoe, seed, SEED, ZOE } from './seed.ts';
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
const zoe = () => signIn(ZOE.username, ZOE.password);
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

const TODAY = () => new Date().toISOString().slice(0, 10);
async function log(cookie: string, partnerId: string, kind: string, minutes: number) {
  const response = await call(cookie, 'POST', '/together/sessions', { partnerId, kind, minutes, readOn: TODAY() });
  assert.equal(response.status, 201);
  return ((await response.json()) as { id: string }).id;
}

test('Given sessions of each kind, then each reader’s helper minutes are the sessions she read aloud or helped in, once each', async () => {
  await call(await dad(), 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 120 });
  const niaCookie = await nia();
  const zoeCookie = await zoe();
  await log(niaCookie, ZOE.id, 'read-to', 20);
  await log(niaCookie, ZOE.id, 'helped', 25);
  const zoeLogged = await log(zoeCookie, SEED.readerId, 'read-to-me', 15);
  await log(zoeCookie, SEED.readerId, 'read-to', 10);
  await call(zoeCookie, 'POST', `/together/sessions/${zoeLogged}/confirm`);
  await call(niaCookie, 'POST', `/together/sessions/${zoeLogged}/confirm`);

  const set = (await reward(niaCookie))!;
  assert.deepEqual(set.minutes, { [SEED.readerId]: 60, [ZOE.id]: 10 });
  assert.equal(set.earnedBy, null);
});

test('Given Nia reaches 120 helper minutes, then she earns the reward, and it stays hers when a session is later removed', async () => {
  await call(await dad(), 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 120 });
  const niaCookie = await nia();
  const first = await log(niaCookie, ZOE.id, 'read-to', 60);
  await log(niaCookie, ZOE.id, 'read-to', 59);
  assert.equal((await reward(niaCookie))!.earnedBy, null);

  await log(niaCookie, ZOE.id, 'helped', 5);
  assert.deepEqual((await reward(niaCookie))!.earnedBy, { id: SEED.readerId, name: 'Nia', color: 'rose', photo: null });

  await db.pool.query('UPDATE reading_session SET removed_at = $1 WHERE id = $2', [new Date().toISOString(), first]);
  const after = (await reward(niaCookie))!;
  assert.equal(after.minutes[SEED.readerId], 64);
  assert.equal(after.earnedBy!.name, 'Nia');
});

test('Given both sisters are past the target when it is first read, then the one with more minutes earns it', async () => {
  const niaCookie = await nia();
  const zoeCookie = await zoe();
  await log(niaCookie, ZOE.id, 'read-to', 40);
  await log(zoeCookie, SEED.readerId, 'read-to', 50);

  await call(await dad(), 'PUT', '/helper-reward', { name: 'Sweets', targetMinutes: 30 });

  assert.equal((await reward(niaCookie))!.earnedBy!.name, 'Zoe');
});

test('Given a removed session, then its minutes do not count', async () => {
  await call(await dad(), 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 120 });
  const niaCookie = await nia();
  const id = await log(niaCookie, ZOE.id, 'read-to', 30);
  await db.pool.query('UPDATE reading_session SET removed_at = $1 WHERE id = $2', [new Date().toISOString(), id]);

  assert.deepEqual((await reward(niaCookie))!.minutes, {});
});

test('Given the helper reward, then Read together carries it for the shelf card', async () => {
  await call(await dad(), 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 120 });
  const niaCookie = await nia();
  await log(niaCookie, ZOE.id, 'read-to', 20);

  const view = (await (await call(niaCookie, 'GET', '/together')).json()) as { helperReward: HelperReward | null };
  assert.equal(view.helperReward!.name, 'Cinema trip');
  assert.equal(view.helperReward!.minutes[SEED.readerId], 20);
});

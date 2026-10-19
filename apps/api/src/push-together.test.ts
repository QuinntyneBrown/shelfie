// Traces to: L2-144
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { all } from './db.ts';
import type { Push, PushPayload, PushTarget } from './push.ts';
import { addZoe, seed, SEED, ZOE } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const KEYS = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };
const DAD_DEVICE = 'https://push.example.com/dad';
const MUM_DEVICE = 'https://push.example.com/mum';
const NIA_DEVICE = 'https://push.example.com/nia';
const OTHER_DEVICE = 'https://push.example.com/zeds-dad';
const ZOE_DEVICE = 'https://push.example.com/zoe';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;
const logged: string[] = [];
const sent: { target: PushTarget; payload: PushPayload }[] = [];
const scheduled: { work: () => Promise<void>; delayMs: number }[] = [];
let gone = new Set<string>();
let failing = new Set<string>();

const fakePush: Push = {
  publicKey: 'BFakePublicKey',
  async send(target, payload) {
    sent.push({ target, payload });
    if (failing.has(target.endpoint)) throw new Error('push service unavailable');
    return gone.has(target.endpoint) ? 'gone' : 'sent';
  },
};

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, {
    push: fakePush,
    schedule: (work, delayMs) => scheduled.push({ work, delayMs }),
    log: (line) => logged.push(JSON.stringify(line)),
  }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  await db.pool.query('DELETE FROM push_subscription');
  await db.pool.query('DELETE FROM sign_in_attempt');
  await db.pool.query('UPDATE household SET notify_chapter_logged = true, notify_feedback = true, notify_book_reward = true, notify_streak_reward = true');
  await db.pool.query("INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ('p-mum', 'h1', 'parent', 'Mum', 'sky', 'mum', 'mum@example.com', 'x')");
  await addZoe(db.pool);
  sent.length = 0;
  scheduled.length = 0;
  logged.length = 0;
  gone = new Set();
  failing = new Set();
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

function call(cookie: string, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api${path}`, {
    method,
    headers: { ...APP, Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Puts a device on a profile the way the browser does, and the rest straight into the table. */
async function device(profileId: string, endpoint: string) {
  await db.pool.query("INSERT INTO push_subscription (id, profile_id, endpoint, p256dh, auth, created_at) VALUES ($1, $2, $3, $4, $5, '2026-10-19T08:00:00.000Z')", [`ps-${endpoint}`, profileId, endpoint, KEYS.p256dh, KEYS.auth]);
}

async function subscribeAllHouseholdDevices() {
  await device(SEED.parentId, DAD_DEVICE);
  await device('p-mum', MUM_DEVICE);
  await device(SEED.readerId, NIA_DEVICE);
  await device(ZOE.id, ZOE_DEVICE);
  await device('p-other-dad', OTHER_DEVICE);
}

const sentTo = (endpoint: string) => sent.filter((s) => s.target.endpoint === endpoint).map((s) => s.payload);
const TODAY = () => new Date().toISOString().slice(0, 10);

async function logSession(cookie: string, partnerId: string, kind: string, minutes: number) {
  const response = await call(cookie, 'POST', '/together/sessions', { partnerId, kind, minutes, readOn: TODAY() });
  assert.equal(response.status, 201);
  return ((await response.json()) as { id: string }).id;
}

test('Given parent devices, when Nia logs that she read to Zoe, then each parent device is told at once, helper first, and no reader is', async () => {
  await subscribeAllHouseholdDevices();

  const id = await logSession(await nia(), ZOE.id, 'read-to', 20);

  const expected = { title: 'Nia read to Zoe for 20 minutes', body: 'See it on Review.', url: '/review', tag: `together-${id}` };
  assert.deepEqual(scheduled, []);
  assert.deepEqual(sentTo(DAD_DEVICE), [expected]);
  assert.deepEqual(sentTo(MUM_DEVICE), [expected]);
  assert.deepEqual([...sentTo(NIA_DEVICE), ...sentTo(ZOE_DEVICE), ...sentTo(OTHER_DEVICE)], []);
});

test('Given Zoe logs that Nia read to her, then the message still names the helper first', async () => {
  await subscribeAllHouseholdDevices();

  await logSession(await zoe(), SEED.readerId, 'read-to-me', 15);
  await logSession(await zoe(), SEED.readerId, 'helped', 10);

  assert.deepEqual(sentTo(DAD_DEVICE).map((p) => p.title), ['Nia read to Zoe for 15 minutes', 'Zoe helped Nia read for 10 minutes']);
});

test('Given “Tell me when Nia logs a chapter” is off, when a session is logged, then nothing is sent and it is still saved', async () => {
  await subscribeAllHouseholdDevices();
  await db.pool.query('UPDATE household SET notify_chapter_logged = false');

  await logSession(await nia(), ZOE.id, 'read-to', 20);

  assert.deepEqual(sent, []);
});

test('Given reader devices, when Dad gives the helper reward Nia earned, then each reader device is told and no parent is', async () => {
  await subscribeAllHouseholdDevices();
  await call(await dad(), 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 30 });
  await logSession(await nia(), ZOE.id, 'read-to', 30);
  sent.length = 0;

  assert.equal((await call(await dad(), 'POST', '/helper-reward/give')).status, 200);

  const expected = { title: '🤝 Dad gave Nia her helper reward', body: 'Come and see what it is.', url: '/shelf', tag: 'helper-reward' };
  assert.deepEqual(sentTo(NIA_DEVICE), [expected]);
  assert.deepEqual(sentTo(ZOE_DEVICE), [expected]);
  assert.deepEqual([...sentTo(DAD_DEVICE), ...sentTo(MUM_DEVICE), ...sentTo(OTHER_DEVICE)], []);
});

test('Given “…give a streak reward” is off, when Dad gives the helper reward, then nothing is sent and it is still given', async () => {
  await subscribeAllHouseholdDevices();
  await db.pool.query('UPDATE household SET notify_streak_reward = false');
  await call(await dad(), 'PUT', '/helper-reward', { name: 'Cinema trip', targetMinutes: 30 });
  await logSession(await nia(), ZOE.id, 'read-to', 30);
  sent.length = 0;

  assert.equal((await call(await dad(), 'POST', '/helper-reward/give')).status, 200);
  assert.deepEqual(sent, []);
});

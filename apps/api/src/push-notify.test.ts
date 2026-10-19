// Traces to: L2-124, L2-125, L2-126, L2-127, L2-128
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { all } from './db.ts';
import type { Push, PushPayload, PushTarget } from './push.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const KEYS = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };
const DAD_DEVICE = 'https://push.example.com/dad';
const MUM_DEVICE = 'https://push.example.com/mum';
const NIA_DEVICE = 'https://push.example.com/nia';
const OTHER_DEVICE = 'https://push.example.com/zeds-dad';
const UNDO_WINDOW_MS = 11_000;

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
  await device('p-other-dad', OTHER_DEVICE);
}

async function niaLogsChapter12() {
  const response = await call(await nia(), 'POST', '/books/b-lion/chapters/12', { readOn: '2026-10-16', answers: [{ position: 1, text: 'Peter met Aslan at the Stone Table.' }] });
  assert.equal(response.status, 201);
  return ((await response.json()) as { chapterLogId: string }).chapterLogId;
}

async function runScheduled() {
  for (const { work } of scheduled.splice(0)) await work();
}

const sentTo = (endpoint: string) => sent.filter((s) => s.target.endpoint === endpoint).map((s) => s.payload);
const remaining = async () => (await all<{ endpoint: string }>(db.pool, 'SELECT endpoint FROM push_subscription ORDER BY endpoint')).map((r) => r.endpoint);

test('Given parent devices, when Nia logs a chapter and the undo window passes, then each parent device gets one message and nobody else does', async () => {
  await subscribeAllHouseholdDevices();

  const id = await niaLogsChapter12();

  assert.deepEqual(sent, [], 'nothing is sent while she can still undo');
  assert.deepEqual(scheduled.map((s) => s.delayMs), [UNDO_WINDOW_MS]);
  await runScheduled();
  const expected = {
    title: 'Nia read Chapter 12 of The Lion, the Witch and the Wardrobe',
    body: 'Ready for your feedback.',
    url: `/review/chapters/${id}`,
    tag: `chapter-${id}`,
  };
  assert.deepEqual(sentTo(DAD_DEVICE), [expected]);
  assert.deepEqual(sentTo(MUM_DEVICE), [expected]);
  assert.deepEqual(sentTo(NIA_DEVICE), []);
  assert.deepEqual(sentTo(OTHER_DEVICE), []);
  assert.ok(!JSON.stringify(sent).includes('Aslan'), 'her answers are never in a message');
});

test('Given Nia undoes the log within the window, when the window passes, then nothing is sent', async () => {
  await subscribeAllHouseholdDevices();
  const id = await niaLogsChapter12();

  assert.equal((await call(await nia(), 'DELETE', `/chapter-logs/${id}`)).status, 204);
  await runScheduled();

  assert.deepEqual(sent, []);
});

test('Given Dad reviews the chapter before the window ends, when it passes, then no waiting-chapter message is sent', async () => {
  await subscribeAllHouseholdDevices();
  const id = await niaLogsChapter12();

  assert.equal((await call(await dad(), 'POST', `/chapter-logs/${id}/feedback`, { sticker: 'star' })).status, 200);
  sent.length = 0;
  await runScheduled();

  assert.deepEqual(sent, []);
});

test('Given the chapter-logged choice is off, or no parent device is subscribed, when a chapter is logged, then nothing is sent and logging still works', async () => {
  await db.pool.query('UPDATE household SET notify_chapter_logged = false');
  await subscribeAllHouseholdDevices();
  await niaLogsChapter12();
  await runScheduled();
  assert.deepEqual(sent, []);

  await db.pool.query('UPDATE household SET notify_chapter_logged = true');
  await db.pool.query('DELETE FROM push_subscription');
  const response = await call(await nia(), 'POST', '/books/b-lion/chapters/13', { readOn: '2026-10-16', answers: [{ position: 1, text: 'They crowned the kings.' }] });
  assert.equal(response.status, 201);
  await runScheduled();
  assert.deepEqual(sent, []);
});

test('Given the push service fails, when the window passes, then the failure is logged without the endpoint and nothing else breaks', async () => {
  await device(SEED.parentId, DAD_DEVICE);
  failing = new Set([DAD_DEVICE]);
  await niaLogsChapter12();

  await runScheduled();

  assert.equal(sent.length, 1);
  assert.ok(logged.some((line) => line.includes('push-failed')), 'the failure is logged');
  assert.ok(!logged.some((line) => line.includes('push.example.com')), 'the endpoint never is');
  assert.deepEqual(await remaining(), [DAD_DEVICE], 'a failure other than 404 or 410 keeps the subscription');
});

test('Given Nia\'s device, when Dad sends a sticker and a note, then every reader device is told, without the note, and a repeat sends nothing', async () => {
  await subscribeAllHouseholdDevices();
  const cookie = await dad();

  const response = await call(cookie, 'POST', '/chapter-logs/b-lion-c10/feedback', { sticker: 'wise-owl', note: 'You write so well about Edmund.' });

  assert.equal(response.status, 200);
  assert.deepEqual(sentTo(NIA_DEVICE), [
    { title: 'Dad read Chapter 10 and gave you a Wise owl 🦉', body: 'Come and see what they said.', url: '/chapter-logs/b-lion-c10', tag: 'feedback-b-lion-c10' },
  ]);
  assert.deepEqual(sentTo(DAD_DEVICE), []);
  assert.deepEqual(sentTo(MUM_DEVICE), []);
  assert.deepEqual(sentTo(OTHER_DEVICE), []);
  assert.ok(!JSON.stringify(sent).includes('Edmund'), 'the note is never in a message');

  sent.length = 0;
  assert.equal((await call(cookie, 'POST', '/chapter-logs/b-lion-c10/feedback', { sticker: 'star' })).status, 409);
  assert.deepEqual(sent, []);
});

test('Given the sticker choice is off, when Dad sends a sticker, then nothing is sent and the feedback is still saved', async () => {
  await subscribeAllHouseholdDevices();
  await db.pool.query('UPDATE household SET notify_feedback = false');

  assert.equal((await call(await dad(), 'POST', '/chapter-logs/b-lion-c11/feedback', { sticker: 'rocket' })).status, 200);

  assert.deepEqual(sent, []);
  assert.equal((await all<{ sticker: string }>(db.pool, "SELECT sticker FROM chapter_log WHERE id = 'b-lion-c11'"))[0]!.sticker, 'rocket');
});

test('Given Nia\'s device, when Dad gives a book reward, then she is told without the reward\'s text; a refused reward sends nothing', async () => {
  await subscribeAllHouseholdDevices();
  const cookie = await dad();

  assert.equal((await call(cookie, 'POST', '/books/b-matilda/reward', { text: 'A trip to the zoo' })).status, 201);

  assert.deepEqual(sentTo(NIA_DEVICE), [{ title: '🏆 Dad gave you a reward for Matilda', body: 'Come and see what it is.', url: '/shelf', tag: 'reward-b-matilda' }]);
  assert.ok(!JSON.stringify(sent).includes('zoo'));
  assert.deepEqual(sentTo(DAD_DEVICE), []);

  sent.length = 0;
  assert.equal((await call(cookie, 'POST', '/books/b-robot/reward', { text: 'Ice cream' })).status, 400);
  assert.equal((await call(cookie, 'POST', '/books/b-matilda/reward', { text: 'Again' })).status, 409);
  assert.deepEqual(sent, []);
});

test('Given Nia\'s device, when Dad gives the 7-day streak reward, then she is told without the amount; giving it again sends nothing', async () => {
  await subscribeAllHouseholdDevices();
  await db.pool.query("INSERT INTO streak_reward (household_id, milestone, name, amount, earned_at) VALUES ('h1', 7, 'Pocket money', 20, '2026-10-01T00:00:00.000Z')");
  const cookie = await dad();

  assert.equal((await call(cookie, 'POST', '/streak-rewards/7/give')).status, 200);

  assert.deepEqual(sentTo(NIA_DEVICE), [{ title: '🔥 7 days in a row! Dad gave you a reward', body: 'Come and see what it is.', url: '/shelf', tag: 'streak-7' }]);
  assert.ok(!JSON.stringify(sent).includes('20') && !JSON.stringify(sent).includes('Pocket'));

  sent.length = 0;
  assert.equal((await call(cookie, 'POST', '/streak-rewards/7/give')).status, 409);
  assert.deepEqual(sent, []);
});

test('Given the book-reward or streak-reward choice is off, when Dad gives that reward, then nothing is sent', async () => {
  await subscribeAllHouseholdDevices();
  await db.pool.query("INSERT INTO streak_reward (household_id, milestone, name, earned_at) VALUES ('h1', 7, 'Ice cream', '2026-10-01T00:00:00.000Z')");
  await db.pool.query('UPDATE household SET notify_book_reward = false, notify_streak_reward = false');
  const cookie = await dad();

  assert.equal((await call(cookie, 'POST', '/books/b-matilda/reward', { text: 'A trip to the zoo' })).status, 201);
  assert.equal((await call(cookie, 'POST', '/streak-rewards/7/give')).status, 200);

  assert.deepEqual(sent, []);
});

test('Given the push service no longer knows a device, when a message is sent, then that subscription is deleted and the others stay', async () => {
  await subscribeAllHouseholdDevices();
  await device(SEED.readerId, `${NIA_DEVICE}-old`);
  gone = new Set([`${NIA_DEVICE}-old`]);

  await call(await dad(), 'POST', '/chapter-logs/b-lion-c10/feedback', { sticker: 'star' });

  assert.equal(sentTo(NIA_DEVICE).length, 1);
  assert.equal(sentTo(`${NIA_DEVICE}-old`).length, 1);
  assert.deepEqual(await remaining(), [DAD_DEVICE, MUM_DEVICE, NIA_DEVICE, OTHER_DEVICE]);
});

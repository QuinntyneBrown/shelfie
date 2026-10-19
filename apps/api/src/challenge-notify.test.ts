// Traces to: L2-145
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import type { Push, PushPayload, PushTarget } from './push.ts';
import { hashSecret } from './secret.ts';
import { seed, SEED } from './seed.ts';
import { todayIn } from './streak.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const KEYS = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };
const DAD_DEVICE = 'https://push.example.com/dad';
const NIA_DEVICE = 'https://push.example.com/nia';
const OTHER_DEVICE = 'https://push.example.com/zeds-dad';
const THEO_PASSWORD = hashSecret('theo-reads-6');

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;
const sent: { target: PushTarget; payload: PushPayload }[] = [];
const scheduled: (() => Promise<void>)[] = [];

const fakePush: Push = {
  publicKey: 'BFakePublicKey',
  async send(target, payload) {
    sent.push({ target, payload });
    return 'sent';
  },
};

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { push: fakePush, schedule: (work) => scheduled.push(work), log: () => {} }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  await db.pool.query("UPDATE chapter_log SET logged_at = '2000-01-01T12:00:00.000Z', read_on = '2000-01-01'");
  await db.pool.query(
    "INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ('p-theo', $1, 'reader', 'Theo', 'mint', 'theo', NULL, $2)",
    [SEED.householdId, THEO_PASSWORD],
  );
  for (const [profileId, endpoint] of [[SEED.parentId, DAD_DEVICE], [SEED.readerId, NIA_DEVICE], ['p-other-dad', OTHER_DEVICE]]) {
    await db.pool.query("INSERT INTO push_subscription (id, profile_id, endpoint, p256dh, auth, created_at) VALUES ($1, $2, $3, $4, $5, '2026-10-19T08:00:00.000Z')", [
      `ps-${endpoint}`,
      profileId,
      endpoint,
      KEYS.p256dh,
      KEYS.auth,
    ]);
  }
  sent.length = 0;
  scheduled.length = 0;
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
const theo = () => signIn('theo', 'theo-reads-6');

function call(cookie: string, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api${path}`, {
    method,
    headers: { ...APP, Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const TODAY = () => todayIn('UTC', new Date());

async function startRace(): Promise<string> {
  const response = await call(await dad(), 'POST', '/challenges', { name: 'Half-term reading race', measure: 'chapters', goal: 15, length: 'two-weeks', readerIds: ['p-nia', 'p-theo'] });
  assert.equal(response.status, 201);
  return ((await response.json()) as { id: string }).id;
}

let nextRobotChapter = 4;
/** A reader logs the next chapter of The Wild Robot through the app, and the undo window passes. */
async function logs(cookie: string) {
  const response = await call(cookie, 'POST', `/books/b-robot/chapters/${nextRobotChapter++}`, { readOn: TODAY(), answers: [{ position: 1, text: 'The robot learned to talk to geese.' }] });
  assert.equal(response.status, 201);
  for (const work of scheduled.splice(0)) await work();
}

const sentTo = (endpoint: string) => sent.filter((s) => s.target.endpoint === endpoint).map((s) => s.payload);
const titlesTo = (endpoint: string) => sentTo(endpoint).map((p) => p.title);

beforeEach(() => {
  nextRobotChapter = 4;
});

test('Given a running race, when Theo logs a chapter and moves ahead alone, then Dad’s devices hear he took the lead, and nobody else does', async () => {
  const id = await startRace();

  await logs(await theo());

  assert.deepEqual(
    sentTo(DAD_DEVICE).filter((p) => p.tag.startsWith('challenge')),
    [{ title: '👑 Theo took the lead in Half-term reading race', body: 'Theo has 1 chapter; Nia has 0.', url: '/review?tab=challenges', tag: `challenge-lead-${id}` }],
  );
  assert.deepEqual(sentTo(NIA_DEVICE), []);
  assert.deepEqual(sentTo(OTHER_DEVICE), []);
});

test('Given Theo already leads, then another chapter from him sends nothing; a tie sends nothing; Nia moving ahead does', async () => {
  await startRace();
  const theoCookie = await theo();
  const niaCookie = await nia();
  await logs(theoCookie);
  await logs(theoCookie);
  await logs(niaCookie);
  await logs(niaCookie);
  assert.deepEqual(titlesTo(DAD_DEVICE).filter((t) => t.startsWith('👑')), ['👑 Theo took the lead in Half-term reading race']);

  await logs(niaCookie);
  assert.deepEqual(titlesTo(DAD_DEVICE).filter((t) => t.startsWith('👑')), ['👑 Theo took the lead in Half-term reading race', '👑 Nia took the lead in Half-term reading race']);
});

test('Given “takes the lead” is switched off, then nothing is sent for it', async () => {
  await startRace();
  await db.pool.query('UPDATE household SET notify_challenge_lead = false');

  await logs(await theo());

  assert.deepEqual(titlesTo(DAD_DEVICE).filter((t) => t.startsWith('👑')), []);
});

test('Given Dad ends a race now, then his devices hear once who won', async () => {
  const id = await startRace();
  await logs(await theo());
  sent.length = 0;

  assert.equal((await call(await dad(), 'POST', `/challenges/${id}/end`)).status, 200);

  assert.deepEqual(sentTo(DAD_DEVICE), [
    { title: '🏁 Half-term reading race is over: Theo won!', body: 'Give a reward from Review.', url: '/review?tab=challenges', tag: `challenge-end-${id}` },
  ]);
  assert.deepEqual(sentTo(NIA_DEVICE), []);
});

test('Given a race whose last day passed with nothing logged, when Nia next opens her shelf, then Dad hears once that nobody won', async () => {
  const id = await startRace();
  await db.pool.query("UPDATE challenge SET starts_on = '2026-01-01', ends_on = '2026-01-14'");

  await call(await nia(), 'GET', '/challenges');
  await call(await nia(), 'GET', '/challenges');

  assert.deepEqual(sentTo(DAD_DEVICE), [{ title: '🏁 Half-term reading race is over', body: 'No winner this time.', url: '/review?tab=challenges', tag: `challenge-end-${id}` }]);
});

test('Given a race whose last day passed, when a reader logs her next chapter, then Dad hears it ended, and no lead is announced', async () => {
  await startRace();
  await db.pool.query("UPDATE challenge SET starts_on = '2026-01-01', ends_on = '2026-01-14'");

  await logs(await theo());

  assert.deepEqual(titlesTo(DAD_DEVICE).filter((t) => t.startsWith('🏁') || t.startsWith('👑')), ['🏁 Half-term reading race is over']);
});

test('Given “challenge ends” is switched off, then ending sends nothing', async () => {
  const id = await startRace();
  await db.pool.query('UPDATE household SET notify_challenge_end = false');

  await call(await dad(), 'POST', `/challenges/${id}/end`);

  assert.deepEqual(sent, []);
});

// Traces to: L2-124, L2-145
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const ALL_ON = { chapterLogged: true, feedback: true, bookReward: true, streakReward: true, challengeLead: true, challengeEnd: true };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { push: null }).listen(0);
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

const settings = (cookie: string) => fetch(`${url}/api/settings`, { headers: { ...APP, Cookie: cookie } });
const patch = (cookie: string, notifications?: unknown) =>
  fetch(`${url}/api/settings`, {
    method: 'PATCH',
    headers: { ...APP, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme: 'device', account: { name: 'Dad', email: SEED.parentEmail }, ...(notifications === undefined ? {} : { notifications }) }),
  });
const choices = async (cookie: string) => ((await (await settings(cookie)).json()) as { notifications: unknown }).notifications;

test('Given a household that never changed them, when a parent reads the settings, then all six choices are on', async () => {
  assert.deepEqual(await choices(await dad()), ALL_ON);
});

test('Given a parent, when one choice is turned off and saved, then it stays off after a reload and the others are unchanged', async () => {
  const cookie = await dad();

  const response = await patch(cookie, { ...ALL_ON, feedback: false });

  assert.equal(response.status, 200);
  assert.deepEqual(((await response.json()) as { notifications: unknown }).notifications, { ...ALL_ON, feedback: false });
  assert.deepEqual(await choices(cookie), { ...ALL_ON, feedback: false });
  assert.deepEqual(await choices(await dad()), { ...ALL_ON, feedback: false }, 'it is the household\'s, not the session\'s');
});

test('Given a save that leaves the choices out, then they stay as they were', async () => {
  const cookie = await dad();
  await patch(cookie, { ...ALL_ON, bookReward: false });

  assert.equal((await patch(cookie)).status, 200);

  assert.deepEqual(await choices(cookie), { ...ALL_ON, bookReward: false });
});

test('Given a choice that is not true or false, or one that does not exist, then the API answers 400 validation naming the field and changes nothing', async () => {
  const cookie = await dad();
  const cases: [unknown, string][] = [
    [{ ...ALL_ON, feedback: 'yes' }, 'notifications.feedback'],
    [{ ...ALL_ON, chapterLogged: null }, 'notifications.chapterLogged'],
    [{ ...ALL_ON, streakReward: 0 }, 'notifications.streakReward'],
    [{ ...ALL_ON, challengeEnd: 'no' }, 'notifications.challengeEnd'],
    [{ ...ALL_ON, sparkles: true }, 'notifications'],
    [{ feedback: false }, 'notifications.chapterLogged'],
    ['off', 'notifications'],
  ];
  for (const [body, field] of cases) {
    const response = await patch(cookie, body);
    assert.equal(response.status, 400, JSON.stringify(body));
    const problem = (await response.json()) as { type: string; errors: { field: string }[] };
    assert.equal(problem.type, 'validation');
    assert.ok(problem.errors.some((e) => e.field === field), `${JSON.stringify(body)} names ${field}`);
  }
  assert.deepEqual(await choices(cookie), ALL_ON);
});

test('Given a reader, when she reads or saves the settings, then the API answers 403 grown-ups-only and changes nothing', async () => {
  const cookie = await nia();

  const read = await settings(cookie);
  const save = await patch(cookie, { ...ALL_ON, feedback: false });

  assert.equal(read.status, 403);
  assert.equal(((await read.json()) as { type: string }).type, 'grown-ups-only');
  assert.equal(save.status, 403);
  assert.equal(((await save.json()) as { type: string }).type, 'grown-ups-only');
  assert.deepEqual(await choices(await dad()), ALL_ON);
});

test('Given two households, when one parent turns a choice off, then the other household\'s choices are unchanged', async () => {
  await patch(await dad(), { ...ALL_ON, chapterLogged: false });

  assert.deepEqual(await choices(await zedsDad()), ALL_ON);
});

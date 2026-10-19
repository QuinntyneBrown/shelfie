// Traces to: L2-137, L2-138, L2-139, L2-145, L2-146
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { addZoe, seed, SEED, ZOE } from './seed.ts';
import { todayIn } from './streak.ts';
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
const zed = () => signIn('zed', 'zed-reads-4');

function call(cookie: string, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api/together${path}`, {
    method,
    headers: { ...APP, Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface Reader {
  id: string;
  name: string;
  color: string;
  photo: string | null;
}
interface Session {
  id: string;
  helper: Reader;
  other: Reader;
  action: 'read-to' | 'helped';
  minutes: number;
  readOn: string;
  loggedById: string;
  confirmed: boolean;
}
interface Together {
  today: string;
  partners: Reader[];
  sessions: Session[];
}

async function together(cookie: string): Promise<Together> {
  const response = await call(cookie, 'GET', '');
  assert.equal(response.status, 200);
  return (await response.json()) as Together;
}

const TODAY = () => todayIn('UTC', new Date());
const log = (cookie: string, body: Record<string, unknown>) =>
  call(cookie, 'POST', '/sessions', { partnerId: ZOE.id, kind: 'read-to', minutes: 20, readOn: TODAY(), ...body });

test('Given Nia and Zoe, when Nia opens Read together, then Zoe is her only partner and there are no sessions yet', async () => {
  const view = await together(await nia());

  assert.equal(view.today, TODAY());
  assert.deepEqual(view.partners, [{ id: ZOE.id, name: 'Zoe', color: 'sun', photo: null }]);
  assert.deepEqual(view.sessions, []);
});

test('Given Nia, when she logs that she read to Zoe for 20 minutes today, then it is saved with Nia as the helper and shows for both of them', async () => {
  const response = await log(await nia(), {});

  assert.equal(response.status, 201);
  const session = (await response.json()) as Session;
  assert.equal(session.helper.name, 'Nia');
  assert.equal(session.other.name, 'Zoe');
  assert.equal(session.action, 'read-to');
  assert.equal(session.minutes, 20);
  assert.equal(session.readOn, TODAY());
  assert.equal(session.loggedById, SEED.readerId);
  assert.equal(session.confirmed, false);
  assert.deepEqual((await together(await nia())).sessions, [session]);
  assert.deepEqual((await together(await zoe())).sessions, [session]);
});

test('Given each kind, then the helper is the one who read aloud or helped: "she read to me" credits the partner', async () => {
  const niaCookie = await nia();
  const zoeCookie = await zoe();
  const helped = (await (await log(niaCookie, { kind: 'helped' })).json()) as Session;
  const readToMe = (await (await call(zoeCookie, 'POST', '/sessions', { partnerId: SEED.readerId, kind: 'read-to-me', minutes: 15, readOn: TODAY() })).json()) as Session;

  assert.deepEqual([helped.helper.name, helped.other.name, helped.action], ['Nia', 'Zoe', 'helped']);
  assert.deepEqual([readToMe.helper.name, readToMe.other.name, readToMe.action, readToMe.loggedById], ['Nia', 'Zoe', 'read-to', ZOE.id]);
});

test('Given more than five sessions, then the list holds the newest five', async () => {
  const cookie = await nia();
  for (const minutes of [5, 10, 15, 20, 25, 30]) assert.equal((await log(cookie, { minutes })).status, 201);

  assert.deepEqual((await together(cookie)).sessions.map((s) => s.minutes), [30, 25, 20, 15, 10]);
});

test('Given minutes outside 5 to 180, a fraction, an unknown kind or a missing partner, then the API answers 400 and stores nothing', async () => {
  const cookie = await nia();
  for (const body of [{ minutes: 4 }, { minutes: 181 }, { minutes: 12.5 }, { minutes: '20' }, { kind: 'sang' }, { partnerId: undefined }, { readOn: 'yesterday' }]) {
    const response = await log(cookie, body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(((await response.json()) as { type: string }).type, 'validation');
  }
  assert.equal((await log(cookie, { minutes: 5 })).status, 201);
  assert.equal((await log(cookie, { minutes: 180 })).status, 201);
  assert.equal((await together(cookie)).sessions.length, 2);
});

test('Given a day after today, then the API answers 400 future-date', async () => {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const response = await log(await nia(), { readOn: tomorrow });

  assert.equal(response.status, 400);
  assert.equal(((await response.json()) as { type: string }).type, 'future-date');
});

test('Given a partner who is herself, a parent or a reader of another household, then the API answers 404 and stores nothing', async () => {
  const cookie = await nia();
  for (const partnerId of [SEED.readerId, SEED.parentId, 'p-other-reader', 'nobody']) {
    assert.equal((await log(cookie, { partnerId })).status, 404, partnerId);
  }
  assert.deepEqual((await together(cookie)).sessions, []);
});

test('Given Nia has logged 10 sessions today, when she logs another, then the API answers 409 too-many-sessions; Zoe can still log hers', async () => {
  const cookie = await nia();
  for (let i = 0; i < 10; i++) assert.equal((await log(cookie, {})).status, 201);

  const response = await log(cookie, {});
  assert.equal(response.status, 409);
  assert.equal(((await response.json()) as { type: string }).type, 'too-many-sessions');
  assert.equal((await call(await zoe(), 'POST', '/sessions', { partnerId: SEED.readerId, kind: 'read-to-me', minutes: 10, readOn: TODAY() })).status, 201);
});

test('Given a parent, when he sends a session, then the API answers 403 readers-only', async () => {
  const response = await log(await dad(), {});

  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { type: string }).type, 'readers-only');
});

test('Given a household with one reader, then Read together has no partners', async () => {
  const view = await together(await zed());

  assert.deepEqual(view.partners, []);
  assert.deepEqual(view.sessions, []);
});

test('Given Nia’s sessions, then a reader of another household never sees them', async () => {
  await log(await nia(), {});

  assert.deepEqual((await together(await zed())).sessions, []);
});

test('Given no session cookie, then the API answers 401', async () => {
  assert.equal((await fetch(`${url}/api/together`, { headers: APP })).status, 401);
});

test('Given Nia logged a session with Zoe, when Zoe says it is right, then it is confirmed for both and no second session is made', async () => {
  const session = (await (await log(await nia(), {})).json()) as Session;
  const zoeCookie = await zoe();

  assert.equal((await call(zoeCookie, 'POST', `/sessions/${session.id}/confirm`)).status, 204);
  assert.equal((await call(zoeCookie, 'POST', `/sessions/${session.id}/confirm`)).status, 204);

  const forZoe = (await together(zoeCookie)).sessions;
  assert.equal(forZoe.length, 1);
  assert.equal(forZoe[0]!.confirmed, true);
  assert.equal((await together(await nia())).sessions[0]!.confirmed, true);
});

test('Given a session, when the reader who logged it, a parent or a reader of another household confirms it, then the API answers 404 and nothing changes', async () => {
  const session = (await (await log(await nia(), {})).json()) as Session;

  for (const cookie of [await nia(), await dad(), await zed()]) {
    assert.equal((await call(cookie, 'POST', `/sessions/${session.id}/confirm`)).status, 404);
  }
  assert.equal((await call(await zoe(), 'POST', '/sessions/nothing/confirm')).status, 404);
  assert.equal((await together(await nia())).sessions[0]!.confirmed, false);
});

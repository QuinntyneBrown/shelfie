// Traces to: L2-120, L2-127
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { all } from './db.ts';
import type { Push } from './push.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const ENDPOINT = 'https://push.example.com/send/abc123';
const KEYS = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };

const fakePush: Push = { publicKey: 'BFakePublicKey', send: async () => 'sent' };

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let pushOff: Server;
let url: string;
let offUrl: string;
const logged: string[] = [];

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { push: fakePush, log: (line) => logged.push(JSON.stringify(line)) }).listen(0);
  pushOff = createApp(db.pool, { push: null }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
  offUrl = `http://localhost:${(pushOff.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  pushOff.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  await db.pool.query('DELETE FROM push_subscription');
  await db.pool.query('DELETE FROM sign_in_attempt');
});

async function signIn(base: string, username: string, password: string) {
  const response = await fetch(`${base}/api/auth/password`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const nia = (base = url) => signIn(base, SEED.readerUsername, SEED.readerPassword);
const dad = (base = url) => signIn(base, SEED.parentUsername, SEED.parentPassword);

function call(method: string, path: string, cookie: string | null, body?: unknown, headers: Record<string, string> = APP, base = url) {
  return fetch(`${base}/api/push${path}`, {
    method,
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const subscribe = (cookie: string | null, body: unknown = { endpoint: ENDPOINT, keys: KEYS }, headers?: Record<string, string>) =>
  call('POST', '/subscriptions', cookie, body, headers);
const unsubscribe = (cookie: string | null, endpoint: string = ENDPOINT) => call('DELETE', '/subscriptions', cookie, { endpoint });

const stored = () => all<{ profile_id: string; endpoint: string; p256dh: string; auth: string }>(db.pool, 'SELECT profile_id, endpoint, p256dh, auth FROM push_subscription ORDER BY endpoint');

test('Given push is configured, when a signed-in person asks for the key, then the API answers 200 with the public key only', async () => {
  const response = await call('GET', '/key', await nia());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { publicKey: 'BFakePublicKey' });
});

test('Given push is not configured, when a signed-in person asks for the key, then the API answers 404 push-off', async () => {
  const response = await call('GET', '/key', await nia(offUrl), undefined, APP, offUrl);

  assert.equal(response.status, 404);
  assert.equal(((await response.json()) as { type: string }).type, 'push-off');
});

test('Given no session, when the key is asked for, then the API answers 401', async () => {
  assert.equal((await call('GET', '/key', null)).status, 401);
});

test('Given a signed-in reader, when she stores a subscription, then it is saved against her profile', async () => {
  const response = await subscribe(await nia());

  assert.equal(response.status, 204);
  assert.deepEqual(await stored(), [{ profile_id: SEED.readerId, endpoint: ENDPOINT, ...KEYS }]);
});

test('Given a stored subscription, when another person stores the same endpoint, then there is still one row and it belongs to the latest', async () => {
  await subscribe(await nia());
  await subscribe(await dad());

  assert.deepEqual((await stored()).map((r) => r.profile_id), [SEED.parentId]);
});

test('Given an invalid subscription, then the API answers 400 validation naming the field and stores nothing', async () => {
  const cookie = await nia();
  const cases: [unknown, string][] = [
    [{ endpoint: 'http://push.example.com/x', keys: KEYS }, 'endpoint'],
    [{ endpoint: 'not a url', keys: KEYS }, 'endpoint'],
    [{ endpoint: `https://push.example.com/${'x'.repeat(2048)}`, keys: KEYS }, 'endpoint'],
    [{ keys: KEYS }, 'endpoint'],
    [{ endpoint: ENDPOINT }, 'keys'],
    [{ endpoint: ENDPOINT, keys: { auth: KEYS.auth } }, 'keys.p256dh'],
    [{ endpoint: ENDPOINT, keys: { p256dh: KEYS.p256dh } }, 'keys.auth'],
    [{ endpoint: ENDPOINT, keys: { ...KEYS, auth: 'has spaces and +/ marks' } }, 'keys.auth'],
    [{ endpoint: ENDPOINT, keys: { ...KEYS, p256dh: 'x'.repeat(257) } }, 'keys.p256dh'],
  ];
  for (const [body, field] of cases) {
    const response = await subscribe(cookie, body);
    assert.equal(response.status, 400, JSON.stringify(body).slice(0, 80));
    const problem = (await response.json()) as { type: string; errors: { field: string }[] };
    assert.equal(problem.type, 'validation');
    assert.ok(problem.errors.some((e) => e.field === field), `${JSON.stringify(body).slice(0, 80)} names ${field}`);
  }
  assert.deepEqual(await stored(), []);
});

test('Given a profile or household in the body, then the subscription is still saved against the session', async () => {
  assert.equal((await subscribe(await nia(), { endpoint: ENDPOINT, keys: KEYS, profileId: SEED.parentId, householdId: 'h2' })).status, 204);

  assert.deepEqual((await stored()).map((r) => r.profile_id), [SEED.readerId]);
});

test('Given no session, then both routes answer 401; given no CSRF header, then 403; and nothing changes', async () => {
  assert.equal((await subscribe(null)).status, 401);
  assert.equal((await unsubscribe(null)).status, 401);
  assert.equal((await subscribe(await nia(), undefined, {})).status, 403);
  assert.deepEqual(await stored(), []);
  await subscribe(await nia());
  assert.equal((await call('DELETE', '/subscriptions', await nia(), { endpoint: ENDPOINT }, {})).status, 403);
  assert.equal((await stored()).length, 1);
});

test('Given a stored subscription, when its owner removes it, then it is gone', async () => {
  const cookie = await nia();
  await subscribe(cookie);

  assert.equal((await unsubscribe(cookie)).status, 204);

  assert.deepEqual(await stored(), []);
});

test('Given another profile\'s subscription or an unknown endpoint, when a person removes it, then the API answers 204 and deletes nothing of anyone else\'s', async () => {
  await subscribe(await dad());

  assert.equal((await unsubscribe(await nia())).status, 204);
  assert.equal((await unsubscribe(await nia(), 'https://push.example.com/send/unknown')).status, 204);

  assert.deepEqual((await stored()).map((r) => r.profile_id), [SEED.parentId]);
});

test('Given twenty subscription requests from one person in ten minutes, then the twenty-first answers 429 with Retry-After', async () => {
  const cookie = await nia();
  for (let i = 0; i < 20; i++) assert.equal((await subscribe(cookie)).status, 204);

  const response = await subscribe(cookie);

  assert.equal(response.status, 429);
  assert.equal(((await response.json()) as { type: string }).type, 'too-many-attempts');
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal((await subscribe(await dad())).status, 204, 'the limit is per person');
});

test('Given subscription requests, then the API log never holds the endpoint or the keys', async () => {
  logged.length = 0;
  const cookie = await nia();
  await subscribe(cookie);
  await unsubscribe(cookie);

  assert.ok(logged.length > 0);
  assert.ok(!logged.some((line) => line.includes('push.example.com') || line.includes(KEYS.auth) || line.includes(KEYS.p256dh)));
});

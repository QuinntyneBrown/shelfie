// Traces to: L2-115, L2-116, L2-119
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { all } from './db.ts';
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

beforeEach(async () => {
  await seed(db.pool);
  await db.pool.query('DELETE FROM feedback');
  await db.pool.query('DELETE FROM sign_in_attempt');
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

function send(cookie: string | null, body: unknown, headers: Record<string, string> = APP) {
  return fetch(`${url}/api/feedback`, {
    method: 'POST',
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const stored = () =>
  all<{ household_id: string; profile_id: string; kind: string; score: number | null; message: string | null; created_at: string }>(
    db.pool,
    'SELECT household_id, profile_id, kind, score, message, created_at FROM feedback ORDER BY created_at',
  );

test('Given a signed-in reader, when she sends a score, a kind and a message, then it is saved for her household and profile', async () => {
  const response = await send(await nia(), { score: 5, kind: 'feel', message: '  I love the stickers!  ' });

  assert.equal(response.status, 201);
  assert.ok(((await response.json()) as { id: string }).id);
  const [row, ...rest] = await stored();
  assert.equal(rest.length, 0);
  assert.deepEqual({ ...row, created_at: undefined }, { household_id: 'h1', profile_id: SEED.readerId, kind: 'feel', score: 5, message: 'I love the stickers!', created_at: undefined });
  assert.ok(Date.now() - Date.parse(row!.created_at) < 60_000);
});

test('Given a parent, when they send only a score, or only a message, then each is saved with the other empty', async () => {
  const cookie = await dad();
  assert.equal((await send(cookie, { score: 3, kind: 'feel' })).status, 201);
  assert.equal((await send(cookie, { kind: 'idea', message: 'A weekly e-mail.', score: null })).status, 201);

  const rows = await stored();
  assert.deepEqual(rows.map((r) => [r.profile_id, r.kind, r.score, r.message]), [
    [SEED.parentId, 'feel', 3, null],
    [SEED.parentId, 'idea', null, 'A weekly e-mail.'],
  ]);
});

test('Given invalid feedback, then the API answers 400 validation naming the field and stores nothing', async () => {
  const cookie = await nia();
  const cases: [unknown, string][] = [
    [{ kind: 'feel', score: 0 }, 'score'],
    [{ kind: 'feel', score: 6 }, 'score'],
    [{ kind: 'feel', score: 2.5 }, 'score'],
    [{ kind: 'feel', score: '4' }, 'score'],
    [{ kind: 'rant', score: 4 }, 'kind'],
    [{ score: 4 }, 'kind'],
    [{ kind: 'idea', message: 'x'.repeat(1001) }, 'message'],
    [{ kind: 'feel' }, 'message'],
    [{ kind: 'feel', message: '   ' }, 'message'],
  ];
  for (const [body, field] of cases) {
    const response = await send(cookie, body);
    assert.equal(response.status, 400, JSON.stringify(body));
    const problem = (await response.json()) as { type: string; errors: { field: string }[] };
    assert.equal(problem.type, 'validation');
    assert.ok(problem.errors.some((e) => e.field === field), `${JSON.stringify(body)} names ${field}`);
  }
  assert.equal((await send(cookie, { kind: 'idea', message: ` ${'x'.repeat(1000)} ` })).status, 201, '1,000 after trimming is allowed');
  assert.equal((await stored()).length, 1);
});

test('Given no session, then 401; given no CSRF header, then 403; and nothing is stored', async () => {
  assert.equal((await send(null, { kind: 'feel', score: 4 })).status, 401);
  assert.equal((await send(await nia(), { kind: 'feel', score: 4 }, {})).status, 403);
  assert.deepEqual(await stored(), []);
});

test('Given another household and profile in the body, then the feedback is still saved against the session', async () => {
  assert.equal((await send(await nia(), { kind: 'feel', score: 4, householdId: 'h2', profileId: 'p-other-dad' })).status, 201);

  assert.deepEqual((await stored()).map((r) => [r.household_id, r.profile_id]), [['h1', SEED.readerId]]);
});

test('Given ten feedback requests from one person in ten minutes, then the eleventh answers 429 with Retry-After and stores nothing', async () => {
  const cookie = await nia();
  for (let i = 0; i < 10; i++) assert.equal((await send(cookie, { kind: 'feel', score: 4 })).status, 201);

  const response = await send(cookie, { kind: 'feel', score: 4 });

  assert.equal(response.status, 429);
  assert.equal(((await response.json()) as { type: string }).type, 'too-many-attempts');
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal((await stored()).length, 10);
  assert.equal((await send(await dad(), { kind: 'feel', score: 4 })).status, 201, 'the limit is per person');
});

test('Given feedback with markup, then it is stored as typed and the API log never holds the message', async () => {
  logged.length = 0;
  await send(await nia(), { kind: 'idea', message: '<script>alert("secret-idea")</script>' });

  assert.equal((await stored())[0]!.message, '<script>alert("secret-idea")</script>');
  assert.ok(logged.length > 0 && !logged.some((line) => line.includes('secret-idea')));
});

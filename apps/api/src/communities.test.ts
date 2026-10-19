// Traces to: L2-145, L2-146, L2-147, L2-148, L2-149, L2-150, L2-151, L2-152, L2-153
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { all, get } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
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
  await db.pool.query('DELETE FROM community');
  logged.length = 0;
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
const zedsDad = () => signIn('zedsdad', 'another-pass-99');

function call(cookie: string | null, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api/communities${path}`, {
    method,
    headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface Family {
  name: string;
  you: boolean;
  finished: number | null;
}

interface Community {
  id: string;
  name: string;
  joinCode: string;
  manages: boolean;
  families: Family[];
  goal: unknown;
}

async function start(cookie: string, name = 'Maple Street Readers', familyName = 'The Bells') {
  const response = await call(cookie, 'POST', '', { name, familyName });
  assert.equal(response.status, 201);
  return (await response.json()) as Community;
}

async function join(cookie: string, code: string, familyName = 'The Lins') {
  return call(cookie, 'POST', '/join', { code, familyName });
}

test('Given Dad starts a community, then it has its name, an 8-character code, the Bells as its managing family, and it is listed', async () => {
  const cookie = await dad();

  const community = await start(cookie);

  assert.equal(community.name, 'Maple Street Readers');
  assert.match(community.joinCode, CODE);
  assert.equal(community.manages, true);
  assert.deepEqual(community.families, [{ name: 'The Bells', you: true, finished: null }]);
  assert.equal(community.goal, null);
  const list = (await (await call(cookie, 'GET', '')).json()) as { communities: { id: string; name: string; families: number }[] };
  assert.deepEqual(list.communities.map((c) => [c.id, c.name, c.families]), [[community.id, 'Maple Street Readers', 1]]);
});

test('Given a community or family name that is empty after trimming or longer than 40 characters, then nothing is started', async () => {
  const cookie = await dad();

  for (const body of [
    { name: '   ', familyName: 'The Bells' },
    { name: 'x'.repeat(41), familyName: 'The Bells' },
    { name: 'Maple Street Readers', familyName: '' },
    { name: 'Maple Street Readers', familyName: 'y'.repeat(41) },
    { name: 'Maple Street Readers' },
  ]) {
    const response = await call(cookie, 'POST', '', body);
    assert.equal(response.status, 400);
    assert.equal(((await response.json()) as { type: string }).type, 'validation');
  }
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM community'))!.n, 0);
});

test('Given many communities, then every code is different and uses only the unambiguous characters', async () => {
  const cookie = await dad();
  const codes = new Set<string>();

  for (let i = 0; i < 25; i++) codes.add((await start(cookie, `Club ${i}`)).joinCode);

  assert.equal(codes.size, 25);
  for (const code of codes) assert.match(code, CODE);
});

test('Given the code typed in any case with a dash and spaces, when Zed’s dad joins, then both households see the community and each other’s family name', async () => {
  const community = await start(await dad());
  const typed = ` ${community.joinCode.slice(0, 4).toLowerCase()}-${community.joinCode.slice(4)} `;

  const response = await join(await zedsDad(), typed);

  assert.equal(response.status, 200);
  const joined = (await response.json()) as Community;
  assert.equal(joined.manages, false);
  assert.deepEqual(joined.families, [
    { name: 'The Bells', you: false, finished: null },
    { name: 'The Lins', you: true, finished: null },
  ]);
  const seenByDad = (await (await call(await dad(), 'GET', `/${community.id}`)).json()) as Community;
  assert.deepEqual(seenByDad.families.map((f) => [f.name, f.you]), [['The Bells', true], ['The Lins', false]]);
});

test('Given a code no community has, or a household already in it, then joining answers 404 code-not-found or 409 already-member', async () => {
  const community = await start(await dad());

  const unknown = await join(await zedsDad(), 'ZZZZZZZZ');
  const already = await join(await dad(), community.joinCode, 'The Bells again');

  assert.deepEqual([unknown.status, ((await unknown.json()) as { type: string }).type], [404, 'code-not-found']);
  assert.deepEqual([already.status, ((await already.json()) as { type: string }).type], [409, 'already-member']);
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM community_member'))!.n, 1);
});

test('Given a household tried to join 10 times in 10 minutes, then the next try answers 429 with Retry-After, and another household is not held back', async () => {
  const community = await start(await dad());
  const cookie = await zedsDad();

  for (let i = 0; i < 10; i++) assert.equal((await join(cookie, 'WRONGCDE')).status, 404);
  const blocked = await join(cookie, community.joinCode);

  assert.equal(blocked.status, 429);
  assert.equal(((await blocked.json()) as { type: string }).type, 'too-many-attempts');
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal((await join(await dad(), 'WRONGCDE')).status, 404);
});

test('Given the managing household leaves, then the next household manages the community, and when the last one leaves the community is gone', async () => {
  const community = await start(await dad());
  await join(await zedsDad(), community.joinCode);

  assert.equal((await call(await dad(), 'DELETE', `/${community.id}/membership`)).status, 204);

  assert.equal((await call(await dad(), 'GET', `/${community.id}`)).status, 404);
  assert.deepEqual(((await (await call(await dad(), 'GET', '')).json()) as { communities: unknown[] }).communities, []);
  const left = (await (await call(await zedsDad(), 'GET', `/${community.id}`)).json()) as Community;
  assert.deepEqual([left.manages, left.families.map((f) => f.name)], [true, ['The Lins']]);

  assert.equal((await call(await zedsDad(), 'DELETE', `/${community.id}/membership`)).status, 204);
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM community'))!.n, 0);
});

test('Given no session, then every community route answers 401; given Nia, then every one answers 403 grown-ups-only and nothing changes', async () => {
  const community = await start(await dad());
  const reader = await nia();

  for (const [method, path, body] of [
    ['GET', ''],
    ['POST', '', { name: 'Nia’s club', familyName: 'The Bells' }],
    ['POST', '/join', { code: community.joinCode, familyName: 'The Bells' }],
    ['GET', `/${community.id}`],
    ['DELETE', `/${community.id}/membership`],
  ] as const) {
    assert.equal((await call(null, method, path, body)).status, 401, `${method} ${path} without a session`);
    const response = await call(reader, method, path, body);
    assert.equal(response.status, 403, `${method} ${path} as Nia`);
    assert.equal(((await response.json()) as { type: string }).type, 'grown-ups-only');
  }
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM community_member'))!.n, 1);
});

test('Given a community Zed’s household is not in, or one that does not exist, then reading or leaving it answers 404 and nothing changes', async () => {
  const community = await start(await dad());
  const outsider = await zedsDad();

  for (const id of [community.id, 'no-such-community']) {
    assert.equal((await call(outsider, 'GET', `/${id}`)).status, 404);
    assert.equal((await call(outsider, 'DELETE', `/${id}/membership`)).status, 404);
  }
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM community_member'))!.n, 1);
});

test('Given two households in a community, then no response carries a reader’s name, username, photo, a book title or another household’s id, and the log carries no names or codes', async () => {
  const community = await start(await dad());
  await join(await zedsDad(), community.joinCode);

  const bodies = [
    await (await call(await dad(), 'GET', `/${community.id}`)).text(),
    await (await call(await zedsDad(), 'GET', `/${community.id}`)).text(),
    await (await call(await dad(), 'GET', '')).text(),
    await (await call(await zedsDad(), 'GET', '')).text(),
  ];

  for (const body of bodies) {
    for (const secret of ['Nia', 'nia', 'Zed', 'zed', 'Dad', 'Secret Garden', 'Lion', 'Matilda', 'h1', 'h2', 'p-', 'photo']) {
      assert.ok(!body.includes(secret), `a response carries "${secret}": ${body}`);
    }
  }
  const view = JSON.parse(bodies[0]!) as Community;
  assert.deepEqual(Object.keys(view).sort(), ['families', 'goal', 'id', 'joinCode', 'manages', 'name']);
  for (const family of view.families) assert.deepEqual(Object.keys(family).sort(), ['finished', 'name', 'you']);
  for (const line of logged) {
    for (const secret of ['Maple', 'The Bells', 'The Lins', community.joinCode]) assert.ok(!line.includes(secret), `the log carries "${secret}": ${line}`);
  }
});

test('Given a household is erased with the runbook’s statements, then its memberships go, a community left empty goes, and the other household’s community stays', async () => {
  const shared = await start(await dad(), 'Maple Street Readers');
  const alone = await start(await dad(), 'Just the Bells');
  await join(await zedsDad(), shared.joinCode);

  await db.pool.query('DELETE FROM household WHERE id = $1', [SEED.householdId]);
  await db.pool.query('DELETE FROM community c WHERE NOT EXISTS (SELECT 1 FROM community_member m WHERE m.community_id = c.id)');

  const left = await all<{ id: string; household_id: string }>(db.pool, 'SELECT c.id, m.household_id FROM community c JOIN community_member m ON m.community_id = c.id');
  assert.deepEqual(left, [{ id: shared.id, household_id: 'h2' }]);
  assert.equal((await get(db.pool, 'SELECT 1 FROM community WHERE id = $1', [alone.id])), undefined);
});

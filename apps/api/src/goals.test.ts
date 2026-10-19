// Traces to: L2-152, L2-154, L2-155, L2-156, L2-157, L2-158, L2-159, L2-160, L2-161
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { addSecondReader, seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: () => {} }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  await db.pool.query('DELETE FROM community');
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
const zed = () => signIn('zed', 'zed-reads-4');

function call(cookie: string | null, method: string, path: string, body?: unknown) {
  return fetch(`${url}/api${path}`, {
    method,
    headers: { ...APP, ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

interface GoalView {
  target: number;
  startsOn: string;
  endsOn: string;
  finished: number;
  state: 'in-progress' | 'reached' | 'ended';
}

interface Goals {
  household: GoalView | null;
  communities: { id: string; name: string; goal: GoalView }[];
}

const day = (offset: number) => new Date(Date.now() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

async function goals(cookie: string) {
  const response = await call(cookie, 'GET', '/goals');
  assert.equal(response.status, 200);
  return (await response.json()) as Goals;
}

const finishNow = (bookId: string) => db.pool.query('UPDATE book SET finished_at = $1 WHERE id = $2', [new Date().toISOString(), bookId]);

test('Given no goal, when Dad sets 10 books by a day next month, then it starts today with nothing yet finished, and Nia sees it', async () => {
  const response = await call(await dad(), 'PUT', '/goals/household', { target: 10, endsOn: day(30) });

  assert.equal(response.status, 200);
  const expected = { target: 10, startsOn: day(0), endsOn: day(30), finished: 0, state: 'in-progress' };
  assert.deepEqual(await response.json(), expected);
  assert.deepEqual(await goals(await nia()), { household: expected, communities: [] });
});

test('Given a target outside 1 to 100 or an end date before today or more than 366 days away, then nothing is saved', async () => {
  const cookie = await dad();

  for (const body of [
    { target: 0, endsOn: day(30) },
    { target: 101, endsOn: day(30) },
    { target: 2.5, endsOn: day(30) },
    { target: 10, endsOn: day(-1) },
    { target: 10, endsOn: day(367) },
    { target: 10, endsOn: 'next week' },
  ]) {
    const response = await call(cookie, 'PUT', '/goals/household', body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(((await response.json()) as { type: string }).type, 'validation');
  }
  assert.equal((await goals(cookie)).household, null);
  assert.equal((await call(cookie, 'PUT', '/goals/household', { target: 100, endsOn: day(366) })).status, 200);
});

test('Given a goal, then every reader’s book finished from its first day counts, a book finished before it or in another household does not, and an unfinished book stops counting', async () => {
  await addSecondReader(db.pool);
  const cookie = await dad();
  await call(cookie, 'PUT', '/goals/household', { target: 3, endsOn: day(30) });

  await finishNow('b-lion');
  await finishNow('b-dino');
  await finishNow('b-other');
  assert.equal((await goals(cookie)).household!.finished, 2);

  await db.pool.query("UPDATE book SET finished_at = NULL WHERE id = 'b-dino'");
  assert.equal((await goals(cookie)).household!.finished, 1);
});

test('Given a household in Toronto, then a book counts by the day it was finished there, from the first day to the end date inclusive', async () => {
  await db.pool.query("UPDATE household SET time_zone = 'America/Toronto' WHERE id = $1", [SEED.householdId]);
  await db.pool.query("INSERT INTO reading_goal (id, household_id, target, starts_on, ends_on, created_at) VALUES ('g', $1, 10, '2026-10-10', '2026-10-12', '2026-10-10T12:00:00.000Z')", [SEED.householdId]);
  await db.pool.query("UPDATE book SET finished_at = '2026-10-10T03:30:00.000Z' WHERE id = 'b-lion'"); // 9 Oct, 23:30 in Toronto
  await db.pool.query("UPDATE book SET finished_at = '2026-10-13T02:00:00.000Z' WHERE id = 'b-robot'"); // 12 Oct, 22:00 in Toronto
  await db.pool.query("UPDATE book SET finished_at = '2026-10-13T05:00:00.000Z' WHERE id = 'b-bfg'"); // 13 Oct, 01:00 in Toronto
  await db.pool.query("UPDATE book SET finished_at = NULL WHERE id IN ('b-matilda', 'b-web')");

  assert.equal((await goals(await dad())).household!.finished, 1);
});

test('Given a goal, when Dad edits it, then it keeps counting from its first day; when he removes it, then it is gone for everyone', async () => {
  const cookie = await dad();
  await db.pool.query("INSERT INTO reading_goal (id, household_id, target, starts_on, ends_on, created_at) VALUES ('g', $1, 10, $2, $3, '2026-10-01T00:00:00.000Z')", [SEED.householdId, day(-3), day(10)]);
  await db.pool.query('UPDATE book SET finished_at = $1 WHERE id = $2', [new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 'b-lion']);

  const edited = (await (await call(cookie, 'PUT', '/goals/household', { target: 1, endsOn: day(20) })).json()) as GoalView;

  assert.deepEqual(edited, { target: 1, startsOn: day(-3), endsOn: day(20), finished: 1, state: 'reached' });
  assert.equal((await call(cookie, 'DELETE', '/goals/household')).status, 204);
  assert.equal((await goals(await nia())).household, null);
  assert.equal((await call(cookie, 'DELETE', '/goals/household')).status, 404);
});

test('Given the end date has passed, then a goal short of its target has ended and one that reached it stays reached', async () => {
  await db.pool.query("INSERT INTO reading_goal (id, household_id, target, starts_on, ends_on, created_at) VALUES ('g', $1, 2, $2, $3, '2026-10-01T00:00:00.000Z')", [SEED.householdId, day(-10), day(-1)]);
  await db.pool.query('UPDATE book SET finished_at = $1 WHERE id = $2', [new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 'b-lion']);
  await db.pool.query("UPDATE book SET finished_at = NULL WHERE id IN ('b-matilda', 'b-web')");
  assert.equal((await goals(await dad())).household!.state, 'ended');

  await db.pool.query('UPDATE book SET finished_at = $1 WHERE id = $2', [new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), 'b-robot']);
  assert.equal((await goals(await dad())).household!.state, 'reached');
});

test('Given no session, then the goal routes answer 401; given Nia, then setting or removing the household goal answers 403 and nothing changes', async () => {
  for (const [method, path, body] of [
    ['GET', '/goals'],
    ['PUT', '/goals/household', { target: 5, endsOn: day(10) }],
    ['DELETE', '/goals/household'],
  ] as const) {
    assert.equal((await call(null, method, path, body)).status, 401);
  }
  const reader = await nia();
  assert.equal((await call(reader, 'PUT', '/goals/household', { target: 5, endsOn: day(10) })).status, 403);
  assert.equal((await call(reader, 'DELETE', '/goals/household')).status, 403);
  assert.equal((await goals(reader)).household, null);
});

async function community() {
  const started = (await (await call(await dad(), 'POST', '/communities', { name: 'Maple Street Readers', familyName: 'The Bells' })).json()) as { id: string; joinCode: string };
  await call(await zedsDad(), 'POST', '/communities/join', { code: started.joinCode, familyName: 'The Lins' });
  return started.id;
}

test('Given Dad manages a community, when he sets its goal, then every member household’s finished books add up, each family shows its own count, and readers see the total', async () => {
  const id = await community();
  const set = await call(await dad(), 'PUT', `/communities/${id}/goal`, { target: 40, endsOn: day(60) });
  assert.equal(set.status, 200);

  await finishNow('b-lion');
  await finishNow('b-robot');
  await finishNow('b-other');

  const view = (await (await call(await zedsDad(), 'GET', `/communities/${id}`)).json()) as { goal: GoalView; families: { name: string; finished: number }[] };
  assert.deepEqual(view.goal, { target: 40, startsOn: day(0), endsOn: day(60), finished: 3, state: 'in-progress' });
  assert.deepEqual(view.families.map((f) => [f.name, f.finished]), [['The Bells', 2], ['The Lins', 1]]);
  const zeds = await goals(await zed());
  assert.deepEqual(zeds.communities, [{ id, name: 'Maple Street Readers', goal: view.goal }]);
  assert.deepEqual(Object.keys(zeds.communities[0]!).sort(), ['goal', 'id', 'name']);
});

test('Given a household that does not manage the community, then changing its goal answers 403 owner-only; outside it, 404', async () => {
  const id = await community();
  await call(await dad(), 'PUT', `/communities/${id}/goal`, { target: 40, endsOn: day(60) });

  const put = await call(await zedsDad(), 'PUT', `/communities/${id}/goal`, { target: 5, endsOn: day(10) });
  const remove = await call(await zedsDad(), 'DELETE', `/communities/${id}/goal`);
  assert.deepEqual([put.status, ((await put.json()) as { type: string }).type], [403, 'owner-only']);
  assert.equal(remove.status, 403);

  await call(await zedsDad(), 'DELETE', `/communities/${id}/membership`);
  assert.equal((await call(await zedsDad(), 'PUT', `/communities/${id}/goal`, { target: 5, endsOn: day(10) })).status, 404);
  assert.equal((await goals(await zed())).communities.length, 0);
});

test('Given a community goal, then its target is 1 to 1,000, the manager can remove it, and a household that leaves stops counting', async () => {
  const id = await community();
  const cookie = await dad();
  assert.equal((await call(cookie, 'PUT', `/communities/${id}/goal`, { target: 1001, endsOn: day(60) })).status, 400);
  assert.equal((await call(cookie, 'PUT', `/communities/${id}/goal`, { target: 1000, endsOn: day(60) })).status, 200);
  await finishNow('b-other');
  assert.equal((await goals(cookie)).communities[0]!.goal.finished, 1);

  await call(await zedsDad(), 'DELETE', `/communities/${id}/membership`);
  assert.equal((await goals(cookie)).communities[0]!.goal.finished, 0);

  assert.equal((await call(cookie, 'DELETE', `/communities/${id}/goal`)).status, 204);
  assert.deepEqual((await goals(await nia())).communities, []);
});

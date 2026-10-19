// Traces to: L2-137
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { sha256 } from './auth.service.ts';
import { run } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
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

const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0]!;

async function signIn(username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return cookieOf(response);
}

const PRIYA = { name: 'Priya', email: 'priya@example.com', username: 'priya', password: 'bookworm-2026' };

/** Starts Priya's own household and returns her session cookie. */
async function signUp() {
  const response = await fetch(`${url}/api/auth/sign-up`, { method: 'POST', headers: { ...APP, 'Content-Type': 'application/json' }, body: JSON.stringify(PRIYA) });
  assert.equal(response.status, 201);
  return cookieOf(response);
}

async function session(cookie: string) {
  const response = await fetch(`${url}/api/auth/session`, { headers: { ...APP, Cookie: cookie } });
  assert.equal(response.status, 200);
  return (await response.json()) as { onboarded: boolean };
}

const markDone = (cookie: string) => fetch(`${url}/api/settings/onboarded`, { method: 'POST', headers: { ...APP, Cookie: cookie } });

test('Given a parent signs up, when the session is read, then the household is not onboarded yet', async () => {
  const cookie = await signUp();

  assert.equal((await session(cookie)).onboarded, false);
});

test('Given a household that existed before the wizard, when its parent signs in, then it is onboarded', async () => {
  assert.equal((await session(await signIn(SEED.parentUsername, SEED.parentPassword))).onboarded, true);
});

test('Given an invite into Dad’s household, when Priya accepts it, then her session says the household is onboarded', async () => {
  await run(db.pool, "INSERT INTO invites (token_hash, email, household_id, invited_by, expires_at) VALUES ($1, $2, $3, $4, '2999-01-01')", [
    sha256('invite-token'),
    PRIYA.email,
    SEED.householdId,
    SEED.parentId,
  ]);

  const response = await fetch(`${url}/api/auth/accept-invite`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'invite-token', name: PRIYA.name, username: PRIYA.username, password: PRIYA.password }),
  });

  assert.equal(response.status, 201);
  assert.equal((await session(cookieOf(response))).onboarded, true);
});

test('Given a new household, when its parent marks the wizard done, then every later session says so and marking again is harmless', async () => {
  const cookie = await signUp();

  assert.equal((await markDone(cookie)).status, 204);

  assert.equal((await session(cookie)).onboarded, true);
  assert.equal((await session(await signIn(PRIYA.username, PRIYA.password))).onboarded, true);
  assert.equal((await markDone(cookie)).status, 204);
});

test('Given a parent of another household marks theirs done, then a pending household is untouched', async () => {
  const priya = await signUp();

  assert.equal((await markDone(await signIn(SEED.parentUsername, SEED.parentPassword))).status, 204);

  assert.equal((await session(priya)).onboarded, false);
});

test('Given a reader or nobody, when the wizard is marked done, then it is refused', async () => {
  assert.equal((await markDone(await signIn(SEED.readerUsername, SEED.readerPassword))).status, 403);
  assert.equal((await fetch(`${url}/api/settings/onboarded`, { method: 'POST', headers: APP })).status, 401);
});

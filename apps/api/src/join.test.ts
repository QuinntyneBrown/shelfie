// Traces to: L2-144, L2-148
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { all, get } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie', 'Content-Type': 'application/json' };
const ROSA = { kind: 'author', name: 'Rosa Delgado', email: 'rosa@example.com', username: 'rosawrites', password: 'lighthouse-fox' };
const SAM = { kind: 'volunteer', name: 'Sam Okafor', email: 'sam@example.com', username: 'samreads', password: 'patient-reader' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;
const mails: { to: string; text: string }[] = [];

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: () => {}, mail: async (to, _subject, text) => void mails.push({ to, text }) }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

const join = (body: object) => fetch(`${url}/api/auth/join`, { method: 'POST', headers: APP, body: JSON.stringify(body) });
const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0]!;
const sessionOf = async (cookie: string) => (await fetch(`${url}/api/auth/session`, { headers: { Cookie: cookie } })).json();

for (const account of [ROSA, SAM]) {
  test(`Given Join, when ${account.name} joins as ${account.kind === 'author' ? 'an author' : 'a volunteer'}, then an account outside any household waits for approval and is signed in`, async () => {
    await seed(db.pool);

    const response = await join(account);

    assert.equal(response.status, 201);
    const session = await sessionOf(cookieOf(response));
    assert.deepEqual(
      { name: session.name, username: session.username, role: session.role, email: session.email, theme: session.theme, photo: session.photo },
      { name: account.name, username: account.username, role: account.kind, email: account.email, theme: 'device', photo: null },
    );
    const stored = await get<{ household_id: string | null; status: string }>(
      db.pool,
      'SELECT p.household_id, d.status FROM profile p JOIN directory_profile d ON d.profile_id = p.id WHERE p.username = $1',
      [account.username],
    );
    assert.deepEqual(stored, { household_id: null, status: 'pending' });
  });
}

test('Given a kind other than author or volunteer, when joining, then the API answers 400 and nothing is created', async () => {
  await seed(db.pool);

  for (const kind of ['parent', 'reader', undefined]) {
    const response = await join({ ...ROSA, kind });
    assert.equal(response.status, 400, `kind ${kind}`);
  }

  assert.deepEqual(await all(db.pool, 'SELECT id FROM profile WHERE username = $1', [ROSA.username]), []);
});

test('Given an e-mail and a username, in another case, that accounts already hold, when joining, then the API answers 409 taken naming both and nothing is created', async () => {
  await seed(db.pool);

  const response = await join({ ...ROSA, email: SEED.parentEmail, username: 'NIA' });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { type: 'taken', fields: ['email', 'username'] });
  assert.equal((await get<{ n: number }>(db.pool, 'SELECT COUNT(*) AS n FROM directory_profile'))!.n, 0);
});

test('Given Rosa joined, when she signs in with her username and password, then her session is an author’s', async () => {
  await seed(db.pool);
  await join(ROSA);

  const response = await fetch(`${url}/api/auth/password`, { method: 'POST', headers: APP, body: JSON.stringify({ username: 'RosaWrites', password: ROSA.password, remember: true }) });

  assert.equal(response.status, 200);
  assert.equal((await sessionOf(cookieOf(response))).role, 'author');
});

test('Given Sam joined, when he asks for a reset link with his e-mail, then a link is mailed to him', async () => {
  await seed(db.pool);
  await join(SAM);
  mails.length = 0;

  const response = await fetch(`${url}/api/auth/forgot-password`, { method: 'POST', headers: APP, body: JSON.stringify({ email: SAM.email }) });

  assert.equal(response.status, 202);
  assert.equal(mails.length, 1);
  assert.equal(mails[0]!.to, SAM.email);
  assert.match(mails[0]!.text, /\/reset-password\?token=/);
});

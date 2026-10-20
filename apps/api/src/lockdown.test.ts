// Traces to: L2-175, L2-177
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { seed, SEED } from './seed.ts';
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

/** Every route a household uses, with ids of the seeded household so a parent would get its data back. */
const HOUSEHOLD_ROUTES: [string, string][] = [
  ['GET', '/api/shelf'],
  ['GET', '/api/books'],
  ['POST', '/api/books'],
  ['GET', '/api/books/b-lion'],
  ['PATCH', '/api/books/b-lion'],
  ['DELETE', '/api/books/b-lion'],
  ['GET', '/api/books/search?q=lion'],
  ['GET', '/api/books/search/covers?work=OL1W'],
  ['GET', '/api/books/search/covers/123'],
  ['GET', '/api/books/b-lion/certificate.pdf'],
  ['GET', '/api/books/b-lion/chapters/12/form'],
  ['POST', '/api/books/b-lion/chapters/12'],
  ['PUT', '/api/books/b-lion/cover'],
  ['DELETE', '/api/books/b-lion/cover'],
  ['GET', '/api/books/b-lion/cover'],
  ['GET', '/api/chapter-logs/b-lion-c1'],
  ['POST', '/api/chapter-logs/b-lion-c1/seen'],
  ['DELETE', '/api/chapter-logs/b-lion-c11'],
  ['POST', '/api/books/b-lion/questions'],
  ['PATCH', '/api/questions/q1'],
  ['DELETE', '/api/questions/q1'],
  ['POST', '/api/books/b-lion/question-suggestions'],
  ['GET', '/api/review'],
  ['POST', '/api/chapter-logs/b-lion-c1/feedback'],
  ['POST', '/api/chapter-logs/b-lion-c1/assist'],
  ['POST', '/api/books/b-lion/reward'],
  ['GET', '/api/settings'],
  ['PATCH', '/api/settings'],
  ['POST', '/api/settings/onboarded'],
  ['POST', '/api/auth/verify-email/resend'],
  ['POST', '/api/readers'],
  ['PATCH', `/api/readers/${SEED.readerId}`],
  ['GET', '/api/gallery-rewards'],
  ['POST', '/api/gallery-rewards'],
  ['PATCH', '/api/gallery-rewards/g1'],
  ['DELETE', '/api/gallery-rewards/g1'],
  ['POST', '/api/gallery-rewards/g1/pick'],
  ['POST', '/api/gallery-rewards/g1/pictures'],
  ['DELETE', '/api/gallery-rewards/g1/pictures/p1'],
  ['POST', '/api/gallery-rewards/g1/pictures/p1/feature'],
  ['GET', '/api/gallery-rewards/g1/pictures/p1'],
  ['GET', '/api/streak-rewards'],
  ['PUT', '/api/streak-rewards/7'],
  ['DELETE', '/api/streak-rewards/7'],
  ['POST', '/api/streak-rewards/7/give'],
  ['POST', '/api/feedback'],
  ['GET', '/api/push/key'],
  ['POST', '/api/push/subscriptions'],
  ['DELETE', '/api/push/subscriptions'],
  ['POST', '/api/invites'],
  ['PUT', '/api/profile/photo'],
  ['DELETE', '/api/profile/photo'],
  ['GET', `/api/photos/${SEED.parentId}`],
  ['GET', `/api/photos/${SEED.readerId}`],
];

async function joinAs(kind: 'author' | 'volunteer') {
  const response = await fetch(`${url}/api/auth/join`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, name: kind === 'author' ? 'Rosa Delgado' : 'Sam Okafor', email: `${kind}@example.com`, username: `${kind}1`, password: 'long-enough-1' }),
  });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

function call(cookie: string, method: string, path: string) {
  const raw = path.endsWith('/cover') || path.endsWith('/photo') || path.endsWith('/pictures');
  return fetch(`${url}${path}`, {
    method,
    headers: { ...APP, Cookie: cookie, 'Content-Type': raw ? 'image/jpeg' : 'application/json' },
    body: method === 'GET' || method === 'DELETE' ? undefined : raw ? new Uint8Array([0xff, 0xd8, 0xff]) : '{}',
  });
}

for (const kind of ['author', 'volunteer'] as const) {
  test(`Given ${kind === 'author' ? 'an author' : 'a volunteer'} session, when it calls every household route, then each answers 403 household-only and returns no household data`, async () => {
    await seed(db.pool);
    const cookie = await joinAs(kind);

    for (const [method, path] of HOUSEHOLD_ROUTES) {
      const response = await call(cookie, method, path);
      assert.equal(response.status, 403, `${method} ${path}`);
      assert.deepEqual(await response.json(), { type: 'household-only' }, `${method} ${path}`);
    }
  });
}

test('Given a parent and a reader, when they call their household routes, then the lock-down leaves them working', async () => {
  await seed(db.pool);
  for (const [username, password] of [
    [SEED.parentUsername, SEED.parentPassword],
    [SEED.readerUsername, SEED.readerPassword],
  ]) {
    const signedIn = await fetch(`${url}/api/auth/password`, {
      method: 'POST',
      headers: { ...APP, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember: true }),
    });
    const cookie = signedIn.headers.get('set-cookie')!.split(';')[0]!;

    assert.equal((await call(cookie, 'GET', '/api/shelf')).status, 200, username);
    assert.equal((await call(cookie, 'GET', '/api/books/b-lion')).status, 200, username);
  }
});

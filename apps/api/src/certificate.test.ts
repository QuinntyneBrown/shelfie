// Traces to: L2-120
import { after, before, beforeEach, test } from 'node:test';
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
  server = createApp(db.pool, { log: () => {} }).listen(0);
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

const certificate = (cookie: string, bookId: string) => fetch(`${url}/api/books/${bookId}/certificate.pdf`, { headers: { ...APP, Cookie: cookie } });

test('Given Matilda is finished, when Nia asks for its certificate, then she gets a PDF attachment named for her and the book that is never cached', async () => {
  const response = await certificate(await signIn(SEED.readerUsername, SEED.readerPassword), 'b-matilda');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="nia-matilda-certificate.pdf"');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const body = Buffer.from(await response.arrayBuffer());
  assert.equal(body.subarray(0, 5).toString('latin1'), '%PDF-');
  assert.ok(body.length > 1000, `a drawn page is more than ${body.length} bytes`);
});

test('Given a finished book, when Dad asks for its certificate, then he gets the same PDF', async () => {
  const response = await certificate(await signIn(SEED.parentUsername, SEED.parentPassword), 'b-matilda');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
});

test('Given a book that is not finished, then the certificate answers 409 not-finished', async () => {
  const response = await certificate(await signIn(SEED.readerUsername, SEED.readerPassword), 'b-lion');

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { type: 'not-finished' });
});

test('Given another household’s book, then the certificate answers 404 not-found', async () => {
  const response = await certificate(await signIn(SEED.readerUsername, SEED.readerPassword), 'b-other');

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { type: 'not-found' });
});

test('Given no session, then the certificate answers 401', async () => {
  const response = await fetch(`${url}/api/books/b-matilda/certificate.pdf`, { headers: APP });

  assert.equal(response.status, 401);
});

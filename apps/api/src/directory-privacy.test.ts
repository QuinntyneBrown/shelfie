// Traces to: L2-157, L2-161, L2-162
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import sharp from 'sharp';
import { createApp } from './app.ts';
import { all, run } from './db.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie', 'Content-Type': 'application/json' };
const ROSA = { kind: 'author', name: 'Rosa Delgado', email: 'rosa@example.com', username: 'rosawrites', password: 'lighthouse-fox' };
const ABOUT = { name: 'Rosa Delgado', bio: 'I write adventure stories about brave foxes.', website: 'https://rosadelgado.example.com' };
const FOX = { title: 'The Lighthouse Fox', chapterCount: 12, description: 'A fox cub keeps the lamp burning.' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;
const lines: Record<string, unknown>[] = [];

before(async () => {
  db = await createTestDatabase();
  server = createApp(db.pool, { log: (line) => lines.push(line) }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0]!;
const send = (cookie: string, method: string, path: string, body?: unknown) =>
  fetch(`${url}${path}`, { method, headers: { ...APP, Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });

/** Rosa joins, writes her profile and one book with a picture, and the operator lists her; returns her session and book id. */
async function rosaListed() {
  const rosa = cookieOf(await fetch(`${url}/api/auth/join`, { method: 'POST', headers: APP, body: JSON.stringify(ROSA) }));
  await send(rosa, 'PUT', '/api/me', ABOUT);
  const { id } = await (await send(rosa, 'POST', '/api/catalogue-books', FOX)).json();
  const picture = await sharp({ create: { width: 320, height: 480, channels: 3, background: '#457b9d' } }).jpeg().toBuffer();
  await fetch(`${url}/api/catalogue-books/${id}/cover`, { method: 'PUT', headers: { ...APP, Cookie: rosa, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(picture) });
  await run(db.pool, "UPDATE directory_profile SET status = 'approved'");
  return { rosa, bookId: id as string };
}

/** Everything Rosa can read about herself. */
async function whatRosaSees(rosa: string) {
  return Promise.all(['/api/auth/session', '/api/me', '/api/catalogue-books'].map(async (path) => (await send(rosa, 'GET', path)).text()));
}

test('Given Dad adds Rosa’s book to his shelf from the directory, then nothing Rosa reads changes or names his household, and his book keeps no link to her catalogue', async () => {
  await seed(db.pool);
  const { rosa, bookId } = await rosaListed();
  const before = await whatRosaSees(rosa);
  const dad = cookieOf(
    await fetch(`${url}/api/auth/password`, { method: 'POST', headers: APP, body: JSON.stringify({ username: SEED.parentUsername, password: SEED.parentPassword, remember: true }) }),
  );

  const entry = await (await send(dad, 'GET', `/api/directory/books/${bookId}`)).json();
  const added = await send(dad, 'POST', '/api/books', { title: entry.title, author: entry.author, chapterCount: entry.chapterCount, coverColor: 'sky', sticker: '📚' });
  const { id: householdBookId } = await added.json();
  const cover = Buffer.from(await (await send(dad, 'GET', `/api/directory/books/${bookId}/cover`)).arrayBuffer());
  await fetch(`${url}/api/books/${householdBookId}/cover`, { method: 'PUT', headers: { ...APP, Cookie: dad, 'Content-Type': 'image/webp' }, body: new Uint8Array(cover) });

  assert.equal(added.status, 201);
  const after = await whatRosaSees(rosa);
  assert.deepEqual(after, before);
  for (const text of after) {
    for (const household of [SEED.householdId, SEED.parentId, SEED.readerId, 'Nia', 'Dad', householdBookId]) assert.ok(!text.includes(household), `${household} reached Rosa`);
  }
  const stored = await all<{ row: string }>(db.pool, 'SELECT row_to_json(b)::text AS row FROM book b WHERE b.id = $1', [householdBookId]);
  assert.ok(!stored[0]!.row.includes(bookId), 'the household’s book stores no catalogue id');
});

test('Given a join, a profile and catalogue save, and a parent’s directory reads, then the request log never holds a name, about, website, ages, contact, e-mail or catalogue text', async () => {
  await seed(db.pool);
  lines.length = 0;
  const { rosa, bookId } = await rosaListed();
  const sam = cookieOf(
    await fetch(`${url}/api/auth/join`, { method: 'POST', headers: APP, body: JSON.stringify({ kind: 'volunteer', name: 'Sam Okafor', email: 'sam@example.com', username: 'samreads', password: 'patient-reader' }) }),
  );
  await send(sam, 'PUT', '/api/me', { name: 'Sam Okafor', bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: 'sam.okafor@example.com · weekday afternoons' });
  await send(rosa, 'PATCH', `/api/catalogue-books/${bookId}`, FOX);
  const dad = cookieOf(
    await fetch(`${url}/api/auth/password`, { method: 'POST', headers: APP, body: JSON.stringify({ username: SEED.parentUsername, password: SEED.parentPassword, remember: true }) }),
  );
  await send(dad, 'GET', '/api/directory');
  await send(dad, 'GET', `/api/directory/books/${bookId}`);

  const logged = JSON.stringify(lines);
  assert.ok(lines.length >= 8, 'the requests were logged');
  for (const text of ['Rosa', 'brave foxes', 'rosadelgado.example.com', 'rosa@example.com', 'Lighthouse', 'lamp burning', 'Sam Okafor', 'Retired', 'Ages 6 to 10', 'weekday afternoons', bookId]) {
    assert.ok(!logged.includes(text), `${text} reached the log`);
  }
});

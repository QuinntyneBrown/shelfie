// Traces to: L2-064, L2-065, L2-066, L2-067, L2-069, L2-070
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import type { BookMatch, Provider } from './book-search.service.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;

before(async () => {
  db = await createTestDatabase();
});

after(async () => {
  await db.drop();
});

const WINN: BookMatch[] = [
  { title: 'Because of Winn-Dixie', author: 'Kate DiCamillo', chapterCount: null, coverId: '8739161', suggested: false },
  { title: 'Because of Winn-Dixie: Read-Along Edition', author: 'Kate DiCamillo', chapterCount: null, coverId: null, suggested: false },
  { title: 'Winnie-the-Pooh', author: 'A. A. Milne', chapterCount: null, coverId: '12345', suggested: false },
];

/** A catalogue that answers from a fixed table and remembers what it was asked. */
function fakeCatalogue(answers: Record<string, unknown> = { Winn: WINN }) {
  const asked: string[] = [];
  const provider: Provider = async (title) => {
    asked.push(title);
    return answers[title] ?? [];
  };
  return { provider, asked };
}

/** An API over the given providers, listening on a free port. */
function serve(options: { catalogue?: Provider; ai?: Provider | null } = {}) {
  const server = createApp(db.pool, { log: () => {}, catalogue: options.catalogue ?? fakeCatalogue().provider, ai: options.ai ?? null }).listen(0);
  const url = `http://localhost:${(server.address() as { port: number }).port}`;
  return { server, url, close: () => server.close() };
}

async function signIn(url: string, username: string, password: string) {
  const response = await fetch(`${url}/api/auth/password`, {
    method: 'POST',
    headers: { ...APP, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, remember: true }),
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

const search = (url: string, cookie: string | null, q: string | null) =>
  fetch(`${url}/api/books/search${q === null ? '' : `?q=${encodeURIComponent(q)}`}`, { headers: cookie ? { Cookie: cookie } : {} });

async function withServer(options: Parameters<typeof serve>[0], run: (url: string) => Promise<void>) {
  await seed(db.pool);
  const { url, close } = serve(options);
  try {
    await run(url);
  } finally {
    close();
  }
}

test('Given Nia is signed in, when she searches a title, then the catalogue is asked for the title only and its matches come back in order', async () => {
  const catalogue = fakeCatalogue();
  await withServer({ catalogue: catalogue.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);

    const response = await search(url, cookie, 'Winn');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { matches: WINN });
    assert.deepEqual(catalogue.asked, ['Winn']);
  });
});

test('Given Dad is signed in, when he searches, then he gets the same answer as Nia', async () => {
  await withServer({}, async (url) => {
    const cookie = await signIn(url, SEED.parentUsername, SEED.parentPassword);
    const response = await search(url, cookie, 'Winn');
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { matches: BookMatch[] }).matches.length, 3);
  });
});

test('Given no session, when a title is searched, then the API answers 401 and the catalogue is not asked', async () => {
  const catalogue = fakeCatalogue();
  await withServer({ catalogue: catalogue.provider }, async (url) => {
    const response = await search(url, null, 'Winn');
    assert.equal(response.status, 401);
    assert.deepEqual(catalogue.asked, []);
  });
});

test('Given q is missing, blank, under 3 or over 120 characters, when searched, then the API answers 400 validation without asking the catalogue', async () => {
  const catalogue = fakeCatalogue();
  await withServer({ catalogue: catalogue.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    for (const q of [null, '', '  ', 'Wi', '  Wi  ', 'x'.repeat(121)]) {
      const response = await search(url, cookie, q);
      assert.equal(response.status, 400, `q=${JSON.stringify(q)}`);
      assert.equal(((await response.json()) as { type: string }).type, 'validation');
    }
    assert.deepEqual(catalogue.asked, []);
  });
});

test('Given the catalogue answers with more than five rows and some that are malformed, then at most five well-formed, bounded matches come back', async () => {
  const raw = [
    { title: '  <b>Matilda</b>  ', author: 'Roald Dahl', chapterCount: 21, coverId: 'not-digits', suggested: true, extra: 'ignored' },
    { title: 'm'.repeat(150), author: 'a'.repeat(150), chapterCount: 500, coverId: 777 },
    { author: 'No title' },
    { title: '' },
    { title: 'Matilda the Musical', author: null, chapterCount: 2.5, coverId: '1' },
    { title: 'Four', author: 'Four' },
    { title: 'Five', author: 'Five' },
    { title: 'Six', author: 'Six' },
    'not an object',
  ];
  await withServer({ catalogue: fakeCatalogue({ Matilda: raw }).provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    const { matches } = (await (await search(url, cookie, 'Matilda')).json()) as { matches: BookMatch[] };
    assert.equal(matches.length, 5);
    assert.deepEqual(matches[0], { title: '<b>Matilda</b>', author: 'Roald Dahl', chapterCount: 21, coverId: null, suggested: false });
    assert.deepEqual(matches[1], { title: 'm'.repeat(120), author: 'a'.repeat(120), chapterCount: null, coverId: '777', suggested: false });
    assert.deepEqual(matches[2], { title: 'Matilda the Musical', author: null, chapterCount: null, coverId: '1', suggested: false });
    assert.deepEqual(matches.map((m) => m.title).slice(3), ['Four', 'Five']);
  });
});

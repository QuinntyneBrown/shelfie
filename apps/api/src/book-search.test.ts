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

const DRAGON = [
  { title: 'Dragon Rider', author: 'Cornelia Funke', chapterCount: 56, coverId: '999' },
  { title: 'Dragon Rider: The Griffin’s Feather', author: 'Cornelia Funke', chapterCount: 40 },
  { title: 'The Dragon Rider’s Handbook', chapterCount: 12 },
  { title: 'A fourth guess', chapterCount: 3 },
];

test('Given the catalogue has nothing and an AI key is configured, when a title is searched, then the AI is asked the title only and at most three matches come back marked suggested, without covers', async () => {
  const ai = fakeCatalogue({ 'Dragon Rider': DRAGON });
  await withServer({ catalogue: fakeCatalogue({}).provider, ai: ai.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);

    const response = await search(url, cookie, 'Dragon Rider');

    assert.equal(response.status, 200);
    const { matches } = (await response.json()) as { matches: BookMatch[] };
    assert.deepEqual(ai.asked, ['Dragon Rider']);
    assert.deepEqual(matches, [
      { title: 'Dragon Rider', author: 'Cornelia Funke', chapterCount: 56, coverId: null, suggested: true },
      { title: 'Dragon Rider: The Griffin’s Feather', author: 'Cornelia Funke', chapterCount: 40, coverId: null, suggested: true },
      { title: 'The Dragon Rider’s Handbook', author: null, chapterCount: 12, coverId: null, suggested: true },
    ]);
  });
});

test('Given the catalogue has matches, when a title is searched, then the AI is not asked', async () => {
  const ai = fakeCatalogue({ Winn: DRAGON });
  await withServer({ ai: ai.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    const { matches } = (await (await search(url, cookie, 'Winn')).json()) as { matches: BookMatch[] };
    assert.deepEqual(ai.asked, []);
    assert.equal(matches.every((m) => !m.suggested), true);
  });
});

const failing: Provider = async () => {
  throw new Error('catalogue down');
};

test('Given the catalogue fails and the AI answers, then its suggestions come back', async () => {
  await withServer({ catalogue: failing, ai: fakeCatalogue({ 'Dragon Rider': DRAGON }).provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    const response = await search(url, cookie, 'Dragon Rider');
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { matches: BookMatch[] }).matches.length, 3);
  });
});

test('Given the catalogue has nothing and no AI is configured, then the answer is an empty list', async () => {
  await withServer({ catalogue: fakeCatalogue({}).provider, ai: null }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    const response = await search(url, cookie, 'Dragon Rider');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { matches: [] });
  });
});

test('Given the catalogue fails and the AI is not configured or fails too, then the API answers 503 lookup-unavailable', async () => {
  for (const ai of [null, failing]) {
    await withServer({ catalogue: failing, ai }, async (url) => {
      const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
      const response = await search(url, cookie, 'Dragon Rider');
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { type: 'lookup-unavailable' });
    });
  }
});

/** A provider that never answers until its signal aborts it. */
const hanging: Provider = (_title, signal) =>
  new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));

test('Given the catalogue does not answer within its time, then the lookup moves on: to the AI when there is one, else to lookup-unavailable', async () => {
  const { searchBooks } = await import('./book-search.service.ts');
  const { Problem } = await import('./problem.ts');

  const suggested = await searchBooks({ catalogue: hanging, ai: fakeCatalogue({ Win: DRAGON }).provider }, 'Win', { catalogueMs: 20, aiMs: 20 });
  assert.equal(suggested.length, 3);
  await assert.rejects(searchBooks({ catalogue: hanging, ai: hanging }, 'Win', { catalogueMs: 20, aiMs: 20 }), (e: unknown) => e instanceof Problem && e.status === 503);
  await assert.rejects(searchBooks({ catalogue: hanging, ai: null }, 'Win', { catalogueMs: 20, aiMs: 20 }), (e: unknown) => e instanceof Problem && e.type === 'lookup-unavailable');
});

test('Given 60 lookups from one source in ten minutes, when a 61st is made, then it is answered 429 with Retry-After, and signing in is still allowed', async () => {
  await withServer({}, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    for (let i = 0; i < 60; i++) assert.equal((await search(url, cookie, 'Winn')).status, 200, `lookup ${i + 1}`);

    const response = await search(url, cookie, 'Winn');

    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { type: 'too-many-attempts' });
    assert.ok(Number(response.headers.get('retry-after')) >= 1);
    await signIn(url, SEED.parentUsername, SEED.parentPassword);
  });
});

test('Given a lookup, then the log line carries the route, status and duration and never the title or the provider’s answer', async () => {
  await seed(db.pool);
  const lines: Record<string, unknown>[] = [];
  const server = createApp(db.pool, { log: (line) => lines.push(line), catalogue: fakeCatalogue({ 'Secret Garden': [{ title: 'The Secret Garden', author: 'F. H. Burnett' }] }).provider, ai: null }).listen(0);
  try {
    const url = `http://localhost:${(server.address() as { port: number }).port}`;
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    assert.equal((await search(url, cookie, 'Secret Garden')).status, 200);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const text = JSON.stringify(lines);
    assert.ok(text.includes('/api/books/search'));
    assert.ok(!text.includes('Secret') && !text.includes('Burnett'));
  } finally {
    server.close();
  }
});

// The real providers, exercised against a fake fetch so no network is needed.

function fakeFetch(answer: { status?: number; body: unknown }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { fetchFn, calls };
}

test('Given Open Library answers, when the catalogue provider is asked, then it sent the title only and maps docs to matches without a chapter count', async () => {
  const { openLibrary } = await import('./catalogue.ts');
  const { fetchFn, calls } = fakeFetch({
    body: { docs: [{ title: 'Because of Winn-Dixie', author_name: ['Kate DiCamillo', 'Someone Else'], cover_i: 8739161, number_of_pages_median: 182 }, { title: 'Winnie-the-Pooh', author_name: [] }, { title: 'No author or cover' }] },
  });

  const matches = await openLibrary(fetchFn)('Winn & co', AbortSignal.timeout(1000));

  assert.equal(calls.length, 1);
  const url = new URL(calls[0]!.url);
  assert.equal(url.origin + url.pathname, 'https://openlibrary.org/search.json');
  assert.equal(url.searchParams.get('title'), 'Winn & co');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['fields', 'limit', 'title']);
  assert.deepEqual(matches, [
    { title: 'Because of Winn-Dixie', author: 'Kate DiCamillo', chapterCount: null, coverId: '8739161' },
    { title: 'Winnie-the-Pooh', author: null, chapterCount: null, coverId: null },
    { title: 'No author or cover', author: null, chapterCount: null, coverId: null },
  ]);
});

test('Given Open Library answers with an error status, when the catalogue provider is asked, then it fails', async () => {
  const { openLibrary } = await import('./catalogue.ts');
  await assert.rejects(openLibrary(fakeFetch({ status: 503, body: {} }).fetchFn)('Winn', AbortSignal.timeout(1000)));
});

test('Given an AI key, when the AI provider is asked, then it posts the title as the only user content with the key in the header and parses the JSON in the reply', async () => {
  const { claude } = await import('./ai.ts');
  const { fetchFn, calls } = fakeFetch({
    body: { content: [{ type: 'text', text: 'Here you go:\n```json\n{"matches":[{"title":"Dragon Rider","author":"Cornelia Funke","chapterCount":56},{"title":"Second","author":null,"chapterCount":"7"}],"note":"ignored"}\n```' }] },
  });

  const matches = await claude(fetchFn, 'sk-test-key')('Dragon Rider', AbortSignal.timeout(1000));

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, 'https://api.anthropic.com/v1/messages');
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.equal(headers['x-api-key'], 'sk-test-key');
  assert.equal(headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(String(calls[0]!.init.body)) as { model: string; messages: { role: string; content: string }[] };
  assert.equal(body.model, 'claude-opus-5-5');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'Dragon Rider' }]);
  assert.deepEqual(matches, [
    { title: 'Dragon Rider', author: 'Cornelia Funke', chapterCount: 56 },
    { title: 'Second', author: null, chapterCount: '7' },
  ]);
});

test('Given the AI answers with no JSON, with an error status, or the key is missing, then the AI provider fails or is not configured', async () => {
  const { claude, configuredAi } = await import('./ai.ts');
  await assert.rejects(claude(fakeFetch({ body: { content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }] } }).fetchFn, 'k')('x', AbortSignal.timeout(1000)));
  await assert.rejects(claude(fakeFetch({ status: 429, body: {} }).fetchFn, 'k')('x', AbortSignal.timeout(1000)));
  assert.equal(configuredAi({}), null);
  assert.notEqual(configuredAi({ ANTHROPIC_API_KEY: 'k' }), null);
});

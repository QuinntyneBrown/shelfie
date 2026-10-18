// Traces to: L2-074, L2-075, L2-076, L2-077, L2-079, L2-080, L2-081
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.ts';
import type { BookMatch, Provider, WorkCoversProvider } from './book-search.service.ts';
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
  { title: 'Because of Winn-Dixie', author: 'Kate DiCamillo', chapterCount: null, coverId: '8739161', workKey: 'OL18020194W', suggested: false },
  { title: 'Because of Winn-Dixie: Read-Along Edition', author: 'Kate DiCamillo', chapterCount: null, coverId: null, workKey: null, suggested: false },
  { title: 'Winnie-the-Pooh', author: 'A. A. Milne', chapterCount: null, coverId: '12345', workKey: 'OL262460W', suggested: false },
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
function serve(options: { catalogue?: Provider; ai?: Provider | null; workCovers?: WorkCoversProvider } = {}) {
  const server = createApp(db.pool, { log: () => {}, catalogue: options.catalogue ?? fakeCatalogue().provider, ai: options.ai ?? null, workCovers: options.workCovers }).listen(0);
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
    { title: '  <b>Matilda</b>  ', author: 'Roald Dahl', chapterCount: 21, coverId: 'not-digits', workKey: '/works/OL1W', suggested: true, extra: 'ignored' },
    { title: 'm'.repeat(150), author: 'a'.repeat(150), chapterCount: 500, coverId: 777 },
    { author: 'No title' },
    { title: '' },
    { title: 'Matilda the Musical', author: null, chapterCount: 2.5, coverId: '1', workKey: 'OL45804W' },
    { title: 'Four', author: 'Four' },
    { title: 'Five', author: 'Five' },
    { title: 'Six', author: 'Six' },
    'not an object',
  ];
  await withServer({ catalogue: fakeCatalogue({ Matilda: raw }).provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    const { matches } = (await (await search(url, cookie, 'Matilda')).json()) as { matches: BookMatch[] };
    assert.equal(matches.length, 5);
    assert.deepEqual(matches[0], { title: '<b>Matilda</b>', author: 'Roald Dahl', chapterCount: 21, coverId: null, workKey: null, suggested: false });
    assert.deepEqual(matches[1], { title: 'm'.repeat(120), author: 'a'.repeat(120), chapterCount: null, coverId: '777', workKey: null, suggested: false });
    assert.deepEqual(matches[2], { title: 'Matilda the Musical', author: null, chapterCount: null, coverId: '1', workKey: 'OL45804W', suggested: false });
    assert.deepEqual(matches.map((m) => m.title).slice(3), ['Four', 'Five']);
  });
});

const DRAGON = [
  { title: 'Dragon Rider', author: 'Cornelia Funke', chapterCount: 56, coverId: '999', workKey: 'OL1W' },
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
      { title: 'Dragon Rider', author: 'Cornelia Funke', chapterCount: 56, coverId: null, workKey: null, suggested: true },
      { title: 'Dragon Rider: The Griffin’s Feather', author: 'Cornelia Funke', chapterCount: 40, coverId: null, workKey: null, suggested: true },
      { title: 'The Dragon Rider’s Handbook', author: null, chapterCount: 12, coverId: null, workKey: null, suggested: true },
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
    body: { docs: [{ key: '/works/OL18020194W', title: 'Because of Winn-Dixie', author_name: ['Kate DiCamillo', 'Someone Else'], cover_i: 8739161, number_of_pages_median: 182 }, { title: 'Winnie-the-Pooh', author_name: [] }, { title: 'No author or cover' }] },
  });

  const matches = await openLibrary(fetchFn)('Winn & co', AbortSignal.timeout(1000));

  assert.equal(calls.length, 1);
  const url = new URL(calls[0]!.url);
  assert.equal(url.origin + url.pathname, 'https://openlibrary.org/search.json');
  assert.equal(url.searchParams.get('title'), 'Winn & co');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['fields', 'limit', 'title']);
  assert.deepEqual(matches, [
    { title: 'Because of Winn-Dixie', author: 'Kate DiCamillo', chapterCount: null, coverId: '8739161', workKey: 'OL18020194W' },
    { title: 'Winnie-the-Pooh', author: null, chapterCount: null, coverId: null, workKey: null },
    { title: 'No author or cover', author: null, chapterCount: null, coverId: null, workKey: null },
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

// The catalogue cover, fetched by the API and put through the cover rules.

async function coverImage(width = 900, height = 1200) {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width, height, channels: 3, background: '#f4a6b8' } })
    .withExif({ IFD0: { Make: 'Pear' } })
    .jpeg()
    .toBuffer();
}

/** Stands in for covers.openlibrary.org: answers each URL with the given status and bytes, and remembers the requests. */
function fakeCoverHost(answer: (url: string) => { status?: number; body: Buffer | string; type?: string; length?: string }) {
  const urls: string[] = [];
  const fetchFn = (async (url: string | URL) => {
    urls.push(String(url));
    const { status = 200, body, type = 'image/jpeg', length } = answer(String(url));
    const headers: Record<string, string> = { 'Content-Type': type };
    if (length) headers['Content-Length'] = length;
    return new Response(typeof body === 'string' ? body : new Uint8Array(body), { status, headers });
  }) as typeof fetch;
  return { fetchFn, urls };
}

const fetchCover = (url: string, cookie: string | null, id: string) => fetch(`${url}/api/books/search/covers/${id}`, { headers: cookie ? { Cookie: cookie } : {} });

async function withCoverHost(host: ReturnType<typeof fakeCoverHost>, run: (url: string, cookie: string) => Promise<void>) {
  await seed(db.pool);
  const server = createApp(db.pool, { log: () => {}, catalogue: fakeCatalogue().provider, ai: null, coverFetch: host.fetchFn }).listen(0);
  try {
    const url = `http://localhost:${(server.address() as { port: number }).port}`;
    await run(url, await signIn(url, SEED.readerUsername, SEED.readerPassword));
  } finally {
    server.close();
  }
}

test('Given a catalogue cover id, when the cover is requested, then the API fetches it from the catalogue’s cover host only and serves a 320 × 480 WebP without metadata, private and sandboxed', async () => {
  const jpeg = await coverImage();
  const host = fakeCoverHost(() => ({ body: jpeg }));
  await withCoverHost(host, async (url, cookie) => {
    const response = await fetchCover(url, cookie, '8739161');

    assert.equal(response.status, 200);
    assert.deepEqual(host.urls, ['https://covers.openlibrary.org/b/id/8739161-L.jpg']);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.equal(response.headers.get('cache-control'), 'private, max-age=3600');
    assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; sandbox");
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const sharp = (await import('sharp')).default;
    const served = Buffer.from(await response.arrayBuffer());
    const image = await sharp(served).metadata();
    assert.deepEqual([image.format, image.width, image.height], ['webp', 320, 480]);
    assert.equal(image.exif, undefined);
    assert.ok(!served.includes(Buffer.from('Pear')));
  });
});

test('Given no session or an id that is not digits, when a cover is requested, then the API answers 401 or 400 and fetches nothing', async () => {
  const host = fakeCoverHost(() => ({ body: 'never' }));
  await withCoverHost(host, async (url, cookie) => {
    assert.equal((await fetchCover(url, null, '8739161')).status, 401);
    for (const id of ['abc', '12a', '1234567890123', '..%2Fetc', 'http%3A%2F%2Fevil.example']) {
      const response = await fetchCover(url, cookie, id);
      assert.equal(response.status, 400, id);
      assert.equal(((await response.json()) as { type: string }).type, 'validation');
    }
    assert.deepEqual(host.urls, []);
  });
});

test('Given the cover host has no such cover or cannot be reached, then the API answers 404 not-found and the search still lists the match', async () => {
  const host = fakeCoverHost(() => ({ status: 404, body: 'gone' }));
  await withCoverHost(host, async (url, cookie) => {
    const missing = await fetchCover(url, cookie, '8739161');
    assert.deepEqual([missing.status, ((await missing.json()) as { type: string }).type], [404, 'not-found']);
    const { matches } = (await (await search(url, cookie, 'Winn')).json()) as { matches: BookMatch[] };
    assert.equal(matches[0]!.coverId, '8739161');
  });
  const down = fakeCoverHost(() => {
    throw new Error('connection refused');
  });
  await withCoverHost(down, async (url, cookie) => {
    assert.equal((await fetchCover(url, cookie, '1')).status, 404);
  });
});

test('Given the cover host serves something that is not a JPEG, PNG or WebP, or more than 5 MB, then the API answers 404 photo-type without decoding it', async () => {
  const svg = fakeCoverHost(() => ({ body: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', type: 'image/svg+xml' }));
  await withCoverHost(svg, async (url, cookie) => {
    const response = await fetchCover(url, cookie, '2');
    assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [404, 'photo-type']);
  });
  const declared = fakeCoverHost(() => ({ body: 'x', length: String(5 * 1024 * 1024 + 1) }));
  await withCoverHost(declared, async (url, cookie) => {
    const response = await fetchCover(url, cookie, '3');
    assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [404, 'photo-type']);
  });
  const oversized = fakeCoverHost(() => ({ body: Buffer.alloc(5 * 1024 * 1024 + 1, 1) }));
  await withCoverHost(oversized, async (url, cookie) => {
    const response = await fetchCover(url, cookie, '4');
    assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [404, 'photo-type']);
  });
  const huge = fakeCoverHost(() => ({ body: Buffer.alloc(0) }));
  const sharp = (await import('sharp')).default;
  const bomb = await sharp({ create: { width: 7000, height: 6000, channels: 3, background: '#fff' } }).png().toBuffer();
  huge.fetchFn = fakeCoverHost(() => ({ body: bomb, type: 'image/png' })).fetchFn;
  await withCoverHost(huge, async (url, cookie) => {
    const response = await fetchCover(url, cookie, '5');
    assert.deepEqual([response.status, ((await response.json()) as { type: string }).type], [404, 'photo-type']);
  });
});

// L2-081: the other covers of a picked book

const coversOf = (url: string, cookie: string | null, work: string | null) =>
  fetch(`${url}/api/books/search/covers${work === null ? '' : `?work=${encodeURIComponent(work)}`}`, { headers: cookie ? { Cookie: cookie } : {} });

/** A work lookup that answers from a fixed table and remembers what it was asked. */
function fakeWorkCovers(answers: Record<string, unknown>) {
  const asked: string[] = [];
  const provider: WorkCoversProvider = async (workKey) => {
    asked.push(workKey);
    if (!(workKey in answers)) throw new Error('catalogue down');
    return answers[workKey];
  };
  return { provider, asked };
}

test('Given a work key, when its covers are requested, then the catalogue is asked for that work only and at most 12 valid ids come back in order', async () => {
  const works = fakeWorkCovers({ OL45804W: [8739161, 1937, -1, 0, 'x', 1.5, 1234567890123, ...Array.from({ length: 20 }, (_, i) => 100 + i)] });
  await withServer({ workCovers: works.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);

    const response = await coversOf(url, cookie, 'OL45804W');

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { covers: [8739161, 1937, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109] });
    assert.deepEqual(works.asked, ['OL45804W']);
  });
});

test('Given a work with no covers or an answer of the wrong shape, then the list is empty', async () => {
  const works = fakeWorkCovers({ OL1W: [], OL2W: { covers: 'none' } });
  await withServer({ workCovers: works.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    assert.deepEqual(await (await coversOf(url, cookie, 'OL1W')).json(), { covers: [] });
    assert.deepEqual(await (await coversOf(url, cookie, 'OL2W')).json(), { covers: [] });
  });
});

test('Given no session, when covers are requested, then the API answers 401 and the catalogue is not asked', async () => {
  const works = fakeWorkCovers({ OL45804W: [1] });
  await withServer({ workCovers: works.provider }, async (url) => {
    assert.equal((await coversOf(url, null, 'OL45804W')).status, 401);
    assert.deepEqual(works.asked, []);
  });
});

test('Given a work key that is missing or not a work key, then the API answers 400 validation without asking the catalogue', async () => {
  const works = fakeWorkCovers({});
  await withServer({ workCovers: works.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    for (const work of [null, '', 'abc', 'OL1', 'OL12345678901W', '../x', 'OL1W/../../x', 'ol1w']) {
      const response = await coversOf(url, cookie, work);
      assert.equal(response.status, 400, String(work));
      assert.equal(((await response.json()) as { type: string }).type, 'validation');
    }
    assert.deepEqual(works.asked, []);
  });
});

test('Given the catalogue fails, when covers are requested, then the API answers 503 lookup-unavailable', async () => {
  await withServer({ workCovers: fakeWorkCovers({}).provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    const response = await coversOf(url, cookie, 'OL45804W');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { type: 'lookup-unavailable' });
  });
});

test('Given 60 searches and cover lists from one source in ten minutes, then the 61st is answered 429 whichever route it uses', async () => {
  const works = fakeWorkCovers({ OL45804W: [1] });
  await withServer({ workCovers: works.provider }, async (url) => {
    const cookie = await signIn(url, SEED.readerUsername, SEED.readerPassword);
    for (let i = 0; i < 30; i++) assert.equal((await search(url, cookie, 'Winn')).status, 200);
    for (let i = 0; i < 30; i++) assert.equal((await coversOf(url, cookie, 'OL45804W')).status, 200);

    const response = await coversOf(url, cookie, 'OL45804W');

    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('retry-after')) >= 1);
  });
});

test('Given Open Library answers, when the work provider is asked, then it fetches that work only and returns its covers list', async () => {
  const { openLibraryWorkCovers } = await import('./catalogue.ts');
  const { fetchFn, calls } = fakeFetch({ body: { title: 'Matilda', covers: [1, 2, 3] } });

  const covers = await openLibraryWorkCovers(fetchFn)('OL45804W', AbortSignal.timeout(1000));

  assert.deepEqual(covers, [1, 2, 3]);
  assert.deepEqual(calls.map((call) => String(call.url)), ['https://openlibrary.org/works/OL45804W.json']);
});

test('Given Open Library answers with an error status or the key is not a work key, then the work provider fails and asks nothing for a bad key', async () => {
  const { openLibraryWorkCovers } = await import('./catalogue.ts');
  await assert.rejects(openLibraryWorkCovers(fakeFetch({ status: 503, body: {} }).fetchFn)('OL45804W', AbortSignal.timeout(1000)));
  const bad = fakeFetch({ body: {} });
  await assert.rejects(openLibraryWorkCovers(bad.fetchFn)('../x', AbortSignal.timeout(1000)));
  assert.equal(bad.calls.length, 0);
});

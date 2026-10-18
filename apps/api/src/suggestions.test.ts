// Traces to: L2-064, L2-066, L2-067, L2-068
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { get } from './db.ts';
import { seed, SEED } from './seed.ts';
import { anthropicSuggester, type SuggestionInput } from './suggestions.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
const DEFAULTS = [
  'What happened in this chapter?',
  'Who was your favourite character in this chapter, and why?',
  'What do you think will happen next?',
];

let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;
/** What the fake provider was asked, and what it answers next. */
let asked: SuggestionInput[] = [];
let answer: () => Promise<string[]>;

before(async () => {
  db = await createTestDatabase();
  const suggest = (input: SuggestionInput) => {
    asked.push(input);
    return answer();
  };
  server = createApp(db.pool, { log: () => {}, suggest }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  asked = [];
  answer = async () => ['Why did Edmund go to the Witch’s house?'];
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

const signInAsDad = () => signIn(SEED.parentUsername, SEED.parentPassword);
const signInAsNia = () => signIn(SEED.readerUsername, SEED.readerPassword);

function askForSuggestions(cookie: string | null, bookId = 'b-lion', headers: Record<string, string> = APP) {
  return fetch(`${url}/api/books/${bookId}/question-suggestions`, {
    method: 'POST',
    headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
  });
}

const questionCount = async () => (await get<{ n: number }>(db.pool, 'SELECT COUNT(*)::int AS n FROM question'))!.n;

test('Given Dad asks for suggestions, then up to 5 usable new ideas come back for the next chapter and nothing is stored', async () => {
  const cookie = await signInAsDad();
  const before = await questionCount();
  answer = async () => [
    '  How did Edmund feel when he got to the Witch’s house?  ',
    'Why?',
    'x'.repeat(201),
    'what happened in this chapter?',
    'How did Edmund feel when he got to the witch’s house?',
    'What clue shows that winter in Narnia is ending?',
    'If you were Lucy, what would you say to Edmund now?',
    'Which part of this chapter would you most like to draw, and why?',
    'Why do you think Aslan’s name made the children feel the way they did?',
    'What would you pack for a trip to Narnia?',
  ];

  const response = await askForSuggestions(cookie);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    chapter: 12,
    suggestions: [
      'How did Edmund feel when he got to the Witch’s house?',
      'What clue shows that winter in Narnia is ending?',
      'If you were Lucy, what would you say to Edmund now?',
      'Which part of this chapter would you most like to draw, and why?',
      'Why do you think Aslan’s name made the children feel the way they did?',
    ],
  });
  assert.equal(await questionCount(), before);
});

test('Given a suggestions request, then the provider is given only the title, author, chapter and the book’s questions', async () => {
  const cookie = await signInAsDad();
  await fetch(`${url}/api/books/b-lion/questions`, {
    method: 'POST',
    headers: { ...APP, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Where did the children go in this chapter?' }),
  });

  await askForSuggestions(cookie);

  assert.deepEqual(asked, [
    {
      title: 'The Lion, the Witch and the Wardrobe',
      author: 'C. S. Lewis',
      chapter: 12,
      questions: [...DEFAULTS, 'Where did the children go in this chapter?'],
    },
  ]);
});

test('Given every idea is unusable, then the answer is an empty list', async () => {
  const cookie = await signInAsDad();
  answer = async () => ['Why?', 'What happened in this chapter?'];

  const response = await askForSuggestions(cookie);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { chapter: 12, suggestions: [] });
});

test('Given Nia, another household’s book, no session or no CSRF header, then the request is refused and the provider is not asked', async () => {
  const nia = await signInAsNia();
  assert.equal((await askForSuggestions(nia)).status, 403);

  const dad = await signInAsDad();
  assert.equal((await askForSuggestions(dad, 'b-other')).status, 404);
  assert.equal((await askForSuggestions(null)).status, 401);
  assert.equal((await askForSuggestions(dad, 'b-lion', {})).status, 403);

  assert.deepEqual(asked, []);
});

test('Given the provider fails or gives up, when Dad asks, then the API answers 502 suggestions-failed', async () => {
  const cookie = await signInAsDad();
  for (const failure of [new Error('provider said 500'), new DOMException('The operation timed out.', 'TimeoutError')]) {
    answer = () => Promise.reject(failure);

    const response = await askForSuggestions(cookie);

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { type: 'suggestions-failed' });
  }
});

test('Given Dad has asked 5 times in 10 minutes, when he asks again, then the API answers 429 without asking the provider', async () => {
  const cookie = await signInAsDad();
  for (let i = 0; i < 5; i++) assert.equal((await askForSuggestions(cookie)).status, 200);

  const response = await askForSuggestions(cookie);

  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { type: 'too-many-attempts' });
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal(asked.length, 5);
});

test('Given no AI key is configured, when Dad asks, then the API answers 503 suggestions-unavailable', async () => {
  const unconfigured = createApp(db.pool, { log: () => {}, suggest: anthropicSuggester(undefined) }).listen(0);
  const base = `http://localhost:${(unconfigured.address() as { port: number }).port}`;
  try {
    const cookie = await signInAsDad();

    const response = await fetch(`${base}/api/books/b-lion/question-suggestions`, { method: 'POST', headers: { ...APP, Cookie: cookie } });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { type: 'suggestions-unavailable' });
  } finally {
    unconfigured.close();
  }
});

const LION = { title: 'The Lion, the Witch and the Wardrobe', author: 'C. S. Lewis', chapter: 12, questions: DEFAULTS };

/** A stand-in for the Anthropic Messages API: records the request and answers with `reply`. */
function messagesApi(reply: () => Response | Promise<Response>) {
  const requests: { url: string; init: RequestInit }[] = [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init: init! });
    return reply();
  };
  return { requests, fetchFn: fetchFn as typeof fetch };
}

const message = (text: string, stop_reason = 'end_turn') =>
  Response.json({ type: 'message', stop_reason, content: [{ type: 'text', text }] });

test('Given a key, then the provider asks Claude once with the key in a header and only the book data as JSON, and reads the questions back', async () => {
  const api = messagesApi(() => message(JSON.stringify({ questions: ['How did Edmund feel?', 'What clue shows winter is ending?'] })));
  const suggest = anthropicSuggester('sk-test-key', { fetch: api.fetchFn })!;

  const ideas = await suggest(LION);

  assert.deepEqual(ideas, ['How did Edmund feel?', 'What clue shows winter is ending?']);
  assert.equal(api.requests.length, 1);
  const [{ url: called, init }] = api.requests;
  assert.equal(called, 'https://api.anthropic.com/v1/messages');
  const headers = init.headers as Record<string, string>;
  assert.equal(headers['x-api-key'], 'sk-test-key');
  assert.equal(headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(String(init.body));
  assert.equal(body.model, 'claude-opus-5-5');
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.deepEqual(body.messages, [{ role: 'user', content: JSON.stringify(LION) }]);
  assert.ok(!String(init.body).includes('sk-test-key'), 'the key travels only in the header');
});

test('Given Claude refuses, answers with an error, or with something that is not a list of questions, then the provider throws', async () => {
  const replies = [
    () => message('', 'refusal'),
    () => Response.json({ type: 'error', error: { type: 'overloaded_error' } }, { status: 529 }),
    () => message('Here are some questions: 1. Why?'),
    () => message(JSON.stringify({ questions: 'Why?' })),
  ];
  for (const reply of replies) {
    const suggest = anthropicSuggester('sk-test-key', { fetch: messagesApi(reply).fetchFn })!;
    await assert.rejects(suggest(LION));
  }
});

test('Given Claude does not answer in time, then the provider gives up', async () => {
  const hanging = (async (_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason)))) as typeof fetch;
  const suggest = anthropicSuggester('sk-test-key', { fetch: hanging, timeoutMs: 50 })!;

  await assert.rejects(suggest(LION), { name: 'TimeoutError' });
});

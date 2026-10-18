// Traces to: L2-064, L2-066, L2-067, L2-068
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { get } from './db.ts';
import { seed, SEED } from './seed.ts';
import type { SuggestionInput } from './suggestions.ts';
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

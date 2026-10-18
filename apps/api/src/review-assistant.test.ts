// Traces to: L2-049, L2-050, L2-051, L2-052, L2-053
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import type { AssistInput } from './review-assistant.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie' };
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

/** What the fake provider was asked, and what it answers next. */
let asked: AssistInput[] = [];
let answer: (input: AssistInput) => Promise<unknown>;

const goodAdvice = async (input: AssistInput) => ({
  answers: input.answers.map((a) => ({ position: a.position, verdict: 'weak', reason: 'Only a few words.' })),
  draft: `Thank you for telling me about Chapter ${input.chapterNumber}!`,
});

before(async () => {
  db = await createTestDatabase();
  const assistant = (input: AssistInput) => {
    asked.push(input);
    return answer(input);
  };
  server = createApp(db.pool, { log: () => {}, assistant }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
});

beforeEach(async () => {
  await seed(db.pool);
  asked = [];
  answer = goodAdvice;
});

after(async () => {
  server.close();
  await db.drop();
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

async function assist(cookie: string, chapterLogId: string, headers: Record<string, string> = APP) {
  const response = await fetch(`${url}/api/chapter-logs/${chapterLogId}/assist`, { method: 'POST', headers: { ...headers, Cookie: cookie } });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

test('Given a pending chapter, when Dad asks for help, then he gets the advice and the assistant is sent only the title, chapter number, questions and answers', async () => {
  const cookie = await signInAsDad();

  const { status, body } = await assist(cookie, 'b-lion-c11');

  assert.equal(status, 200);
  assert.deepEqual(body, {
    answers: [{ position: 1, verdict: 'weak', reason: 'Only a few words.' }],
    draft: 'Thank you for telling me about Chapter 11!',
  });
  assert.deepEqual(asked, [
    {
      bookTitle: 'The Lion, the Witch and the Wardrobe',
      chapterNumber: 11,
      answers: [{ position: 1, question: 'What happened in this chapter?', answer: 'Father Christmas gave them presents.' }],
    },
  ]);
});

test('Given Nia, an already reviewed chapter, another family’s chapter or a cross-site request, when help is asked for, then it is refused and the assistant is not asked', async () => {
  const nia = await signInAsNia();
  assert.deepEqual(await assist(nia, 'b-lion-c11'), { status: 403, body: { type: 'grown-ups-only' } });

  const dad = await signInAsDad();
  assert.deepEqual(await assist(dad, 'b-lion-c9'), { status: 409, body: { type: 'already-reviewed' } });
  assert.equal((await assist(dad, 'b-other-c1')).status, 404);
  assert.deepEqual(await assist(dad, 'b-lion-c11', {}), { status: 403, body: { type: 'cross-site' } });

  assert.deepEqual(asked, []);
});

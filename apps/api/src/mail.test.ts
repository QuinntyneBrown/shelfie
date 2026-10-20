// Traces to: L2-004, L2-034, L2-151
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { renderMail } from './mail-template.ts';
import { seed, SEED } from './seed.ts';
import { createTestDatabase } from './test-db.ts';

const APP = { 'X-Requested-With': 'Shelfie', 'Content-Type': 'application/json' };
interface Sent {
  to: string;
  subject: string;
  text: string;
  html: string;
}
const outbox: Sent[] = [];
let db: Awaited<ReturnType<typeof createTestDatabase>>;
let server: Server;
let url: string;

before(async () => {
  db = await createTestDatabase();
  const mail = async (to: string, subject: string, text: string, html: string) => void outbox.push({ to, subject, text, html });
  server = createApp(db.pool, { push: null, log: () => {}, mail }).listen(0);
  url = `http://localhost:${(server.address() as { port: number }).port}`;
  process.env.APP_URL = 'https://app.shelfie.kids';
});

after(async () => {
  server.close();
  await db.drop();
});

beforeEach(async () => {
  await seed(db.pool);
  outbox.length = 0;
});

async function signInAsDad() {
  const response = await fetch(`${url}/api/auth/password`, {
    method: 'POST',
    headers: APP,
    body: JSON.stringify({ username: SEED.parentUsername, password: SEED.parentPassword, remember: true }),
  });
  return response.headers.get('set-cookie')!.split(';')[0]!;
}

/** The link the HTML part's button points at. */
const buttonHref = (html: string) => html.match(/<a href="([^"]+)" style="display:inline-block;/)?.[1]?.replaceAll('&amp;', '&');

test('Given a parent asks for a reset link, then the mail has the same subject and sentence, the link in both parts, and the branded layout', async () => {
  await fetch(`${url}/api/auth/forgot-password`, { method: 'POST', headers: APP, body: JSON.stringify({ email: SEED.parentEmail }) });

  assert.equal(outbox.length, 1);
  const [mail] = outbox;
  assert.equal(mail.subject, 'Choose a new Shelfie password');
  assert.match(mail.text, /Use this link to choose a new password\. It works once, for 1 hour\./);
  const link = mail.text.match(/https:\/\/app\.shelfie\.kids\/reset-password\?\S+/)?.[0];
  assert.ok(link, 'the text part carries the link');
  assert.equal(buttonHref(mail.html), link);
  assert.match(mail.html, /<h1[^>]*>Choose a new password<\/h1>/);
  assert.match(mail.html, /<img src="https:\/\/app\.shelfie\.kids\/logo\.png"/);
  assert.match(mail.html, /role="presentation"/);
});

test('Given Dad invites a parent, then the mail keeps its subject and sentence, carries the link in both parts and is branded', async () => {
  const cookie = await signInAsDad();
  await fetch(`${url}/api/invites`, { method: 'POST', headers: { ...APP, Cookie: cookie }, body: JSON.stringify({ email: 'priya@example.com' }) });

  const mail = outbox.find((m) => m.to === 'priya@example.com')!;
  assert.equal(mail.subject, 'Dad invited you to Shelfie');
  assert.match(mail.text, /Dad invited you to join their household on Shelfie\. Use this link to create your parent account\. It works once, for 7 days\./);
  const link = mail.text.match(/https:\/\/app\.shelfie\.kids\/accept-invite\?token=\S+/)?.[0];
  assert.ok(link);
  assert.equal(buttonHref(mail.html), link);
  assert.match(mail.html, />Create my account<\/a>/);
});

test('Given text from a person, when a mail is rendered, then it is escaped in the HTML part and kept as typed in the text part', () => {
  const { html, text } = renderMail({
    heading: 'Join <b>Max</b> & co on Shelfie',
    paragraphs: ['"Max" <script>alert(1)</script> invited you.'],
    button: { label: 'Create my account', url: 'https://app.shelfie.kids/accept-invite?token=a&b=c' },
    footer: 'Why you got this.',
  });

  assert.doesNotMatch(html, /<script>|<b>Max/);
  assert.match(html, /Join &lt;b&gt;Max&lt;\/b&gt; &amp; co on Shelfie/);
  assert.match(html, /href="https:\/\/app\.shelfie\.kids\/accept-invite\?token=a&amp;b=c"/);
  assert.match(text, /^Join <b>Max<\/b> & co on Shelfie\n\n"Max" <script>alert\(1\)<\/script> invited you\.\n\nhttps:\/\/app\.shelfie\.kids\/accept-invite\?token=a&b=c\n\nWhy you got this\./);
});

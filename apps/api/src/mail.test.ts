// Traces to: L2-004, L2-136
import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { sendMail } from './mail.ts';

const KEY = Buffer.from('shelfie-test-key').toString('base64');
const CONNECTION = `endpoint=https://acs.example.com/;accesskey=${KEY}`;

let requests: { url: string; init: RequestInit }[];
let respond: () => Response;
const realFetch = globalThis.fetch;

beforeEach(() => {
  requests = [];
  respond = () => new Response('{"id":"op-1","status":"Running"}', { status: 202 });
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    return respond();
  }) as typeof fetch;
  process.env.ACS_CONNECTION_STRING = CONNECTION;
  process.env.MAIL_FROM = 'hello@shelfie.kids';
  delete process.env.SMTP_URL;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.ACS_CONNECTION_STRING;
  delete process.env.MAIL_FROM;
});

test('mail goes to Azure Communication Services signed with the access key', async () => {
  await sendMail('parent@example.com', 'Reset your Shelfie password', 'https://app.shelfie.kids/reset-password?token=abc');

  assert.equal(requests.length, 1);
  const [{ url, init }] = requests;
  assert.equal(url, 'https://acs.example.com/emails:send?api-version=2023-03-31');
  assert.equal(init.method, 'POST');
  const body = JSON.parse(String(init.body));
  assert.deepEqual(body, {
    senderAddress: 'hello@shelfie.kids',
    content: { subject: 'Reset your Shelfie password', plainText: 'https://app.shelfie.kids/reset-password?token=abc' },
    recipients: { to: [{ address: 'parent@example.com' }] },
  });

  const headers = new Headers(init.headers);
  const contentHash = createHash('sha256').update(String(init.body)).digest('base64');
  assert.equal(headers.get('x-ms-content-sha256'), contentHash);
  const date = headers.get('x-ms-date');
  assert.ok(date && !Number.isNaN(Date.parse(date)), 'x-ms-date is an HTTP date');
  const signature = createHmac('sha256', Buffer.from(KEY, 'base64'))
    .update(`POST\n/emails:send?api-version=2023-03-31\n${date};acs.example.com;${contentHash}`)
    .digest('base64');
  assert.equal(headers.get('authorization'), `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`);
});

test('a rejected send is reported, not swallowed', async () => {
  respond = () => new Response('{"error":{"code":"Unauthorized"}}', { status: 401 });
  await assert.rejects(sendMail('parent@example.com', 'Reset', 'link'), /401/);
});

test('with neither provider configured, nothing is sent and nothing throws', async () => {
  delete process.env.ACS_CONNECTION_STRING;
  await sendMail('parent@example.com', 'Reset', 'link');
  assert.equal(requests.length, 0);
});

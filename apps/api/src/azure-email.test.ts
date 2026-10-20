// Traces to: L2-151, L2-153
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendWithAcs, type AcsClient } from './mail.ts';

const message = { to: 'marcus@example.com', subject: 'Confirm your e-mail for Shelfie', text: 'plain words', html: '<p>branded words</p>' };

function fakeClient(status = 'Succeeded') {
  const sent: unknown[] = [];
  let polled = false;
  const client: AcsClient = {
    beginSend: async (email) => {
      sent.push(email);
      return {
        pollUntilDone: async () => {
          polled = true;
          return { status, error: status === 'Succeeded' ? undefined : { message: 'Recipient rejected' } };
        },
      };
    },
  };
  return { client, sent, polled: () => polled };
}

test('Given ACS, when a mail is sent, then it goes from the sender to the recipient with both parts and waits until ACS is done', async () => {
  const acs = fakeClient();

  await sendWithAcs(acs.client, 'hello@shelfie.kids', message);

  assert.deepEqual(acs.sent, [
    {
      senderAddress: 'hello@shelfie.kids',
      recipients: { to: [{ address: 'marcus@example.com' }] },
      content: { subject: 'Confirm your e-mail for Shelfie', plainText: 'plain words', html: '<p>branded words</p>' },
    },
  ]);
  assert.ok(acs.polled());
});

test('Given ACS reports the send did not succeed, when a mail is sent, then the send fails', async () => {
  const acs = fakeClient('Failed');

  await assert.rejects(sendWithAcs(acs.client, 'hello@shelfie.kids', message), /Recipient rejected/);
});

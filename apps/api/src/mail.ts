import { createHash, createHmac } from 'node:crypto';
import { createTransport } from 'nodemailer';

/**
 * Sends a plain-text mail from MAIL_FROM. In production ACS_CONNECTION_STRING names the Azure
 * Communication Services resource (infra/bootstrap.sh writes it to /etc/shelfie/env); locally
 * SMTP_URL names an SMTP server such as Mailpit. With neither set, nothing is sent.
 */
export async function sendMail(to: string, subject: string, text: string) {
  const from = process.env.MAIL_FROM ?? 'shelfie@localhost';
  const connection = process.env.ACS_CONNECTION_STRING;
  if (connection) return sendThroughAzure(connection, from, to, subject, text);
  const url = process.env.SMTP_URL;
  if (!url) {
    console.warn('Neither ACS_CONNECTION_STRING nor SMTP_URL is set; mail to', to, 'was not sent');
    return;
  }
  await createTransport(url).sendMail({ from, to, subject, text });
}

export type Mail = typeof sendMail;

const API_VERSION = '2023-03-31';

// The Email REST API with the resource's access key (HMAC-SHA256 over the method, path and the
// signed headers). A 202 means Azure accepted the mail and delivers it on its own.
async function sendThroughAzure(connection: string, from: string, to: string, subject: string, text: string) {
  const endpoint = new URL(/endpoint=([^;]+)/.exec(connection)![1]);
  const key = Buffer.from(/accesskey=([^;]+)/.exec(connection)![1], 'base64');
  const path = `/emails:send?api-version=${API_VERSION}`;
  const body = JSON.stringify({
    senderAddress: from,
    content: { subject, plainText: text },
    recipients: { to: [{ address: to }] },
  });
  const date = new Date().toUTCString();
  const contentHash = createHash('sha256').update(body).digest('base64');
  const signature = createHmac('sha256', key).update(`POST\n${path}\n${date};${endpoint.host};${contentHash}`).digest('base64');
  const response = await fetch(`${endpoint.origin}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-ms-date': date,
      'x-ms-content-sha256': contentHash,
      authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    },
    body,
  });
  if (response.status !== 202) throw new Error(`Azure Communication Services refused the mail: ${response.status} ${await response.text()}`);
}

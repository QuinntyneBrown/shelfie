import { createTransport } from 'nodemailer';

interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** The part of the Azure Communication Services `EmailClient` Shelfie uses, so a test can pass a fake. */
export interface AcsClient {
  beginSend(message: {
    senderAddress: string;
    recipients: { to: { address: string }[] };
    content: { subject: string; plainText: string; html: string };
  }): Promise<{ pollUntilDone(): Promise<{ status: string; error?: { message?: string } }> }>;
}

/** Sends through ACS and waits until it reports the outcome; anything but Succeeded fails the send. */
export async function sendWithAcs(client: AcsClient, senderAddress: string, { to, subject, text, html }: Message) {
  const poller = await client.beginSend({ senderAddress, recipients: { to: [{ address: to }] }, content: { subject, plainText: text, html } });
  const result = await poller.pollUntilDone();
  if (result.status !== 'Succeeded') throw new Error(result.error?.message ?? `Azure e-mail ended with ${result.status}`);
}

let acsClient: Promise<AcsClient> | undefined;

/** One client for the process, signed in with the VM's managed identity (ADR-0019). Loaded only when ACS is configured. */
function acs(endpoint: string): Promise<AcsClient> {
  acsClient ??= Promise.all([import('@azure/communication-email'), import('@azure/identity')]).then(
    ([{ EmailClient }, { DefaultAzureCredential }]) => new EmailClient(endpoint, new DefaultAzureCredential()) as AcsClient,
  );
  return acsClient;
}

/**
 * Sends a mail with its plain-text and HTML parts: through Azure Communication Services when ACS_EMAIL_ENDPOINT is
 * set, otherwise through the SMTP server named by SMTP_URL; with neither set, nothing is sent.
 */
export async function sendMail(to: string, subject: string, text: string, html: string) {
  const endpoint = process.env.ACS_EMAIL_ENDPOINT;
  if (endpoint) return sendWithAcs(await acs(endpoint), process.env.ACS_EMAIL_SENDER ?? 'hello@shelfie.kids', { to, subject, text, html });
  const url = process.env.SMTP_URL;
  if (!url) {
    console.warn('Neither ACS_EMAIL_ENDPOINT nor SMTP_URL is set; a mail was not sent');
    return;
  }
  await createTransport(url).sendMail({ from: process.env.MAIL_FROM ?? 'Shelfie <hello@shelfie.kids>', to, subject, text, html });
}

export type Mail = typeof sendMail;

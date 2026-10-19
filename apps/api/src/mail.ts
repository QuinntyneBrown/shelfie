import { createTransport } from 'nodemailer';

/** Sends a mail with its plain-text and HTML parts through the SMTP server named by SMTP_URL; with none set, nothing is sent. */
export async function sendMail(to: string, subject: string, text: string, html: string) {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.warn('SMTP_URL is not set; a mail was not sent');
    return;
  }
  await createTransport(url).sendMail({ from: process.env.MAIL_FROM ?? 'Shelfie <hello@shelfie.kids>', to, subject, text, html });
}

export type Mail = typeof sendMail;

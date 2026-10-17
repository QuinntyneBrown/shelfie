import { createTransport } from 'nodemailer';

/** Sends a plain-text mail through the SMTP server named by SMTP_URL; with none set, nothing is sent. */
export async function sendMail(to: string, subject: string, text: string) {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.warn('SMTP_URL is not set; mail to', to, 'was not sent');
    return;
  }
  await createTransport(url).sendMail({ from: process.env.MAIL_FROM ?? 'shelfie@localhost', to, subject, text });
}

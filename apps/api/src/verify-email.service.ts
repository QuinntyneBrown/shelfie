import { randomBytes } from 'node:crypto';
import { get, run, type Db } from './db.ts';
import { sha256 } from './auth.service.ts';
import { sendMail, type Mail } from './mail.ts';
import { renderMail } from './mail-template.ts';

const VERIFY_HOURS = 24;

type Parent = { id: string; name: string; email: string };

/**
 * Issues the parent a fresh confirm link, keeping only its token's hash, and returns the mail that carries it. The
 * parent's unused links are deleted first, so only the newest one works.
 */
export async function issueVerification(db: Db, parent: Parent): Promise<Parameters<Mail>> {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await run(db, 'DELETE FROM email_verification WHERE profile_id = $1 AND used_at IS NULL', [parent.id]);
  await run(db, 'INSERT INTO email_verification (token_hash, profile_id, created_at, expires_at) VALUES ($1, $2, $3, $4)', [
    sha256(token),
    parent.id,
    now.toISOString(),
    new Date(now.getTime() + VERIFY_HOURS * 60 * 60 * 1000).toISOString(),
  ]);
  const link = `${process.env.APP_URL ?? 'http://localhost:4200'}/verify-email?token=${token}`;
  const { html, text } = renderMail({
    heading: 'Confirm your e-mail',
    paragraphs: [`Hi ${parent.name}, welcome to Shelfie! Tap the button to confirm this address is yours. The link works once, for ${VERIFY_HOURS} hours.`],
    button: { label: 'Confirm my e-mail', url: link },
    footer: 'You got this because a Shelfie account was made with this address. If it wasn’t you, ignore this e-mail and nothing happens.',
  });
  return [parent.email, 'Confirm your e-mail for Shelfie', text, html];
}

/** Issues a fresh confirm link and waits until the mail is handed over. */
export async function sendVerification(db: Db, parent: Parent, mail: Mail = sendMail) {
  await mail(...(await issueVerification(db, parent)));
}

/** Spends a live confirm token and marks its parent's e-mail verified; returns the address. Null when the link is used, replaced, expired or unknown. */
export async function verifyEmail(db: Db, token: string): Promise<string | null> {
  const now = new Date().toISOString();
  const spent = await get<{ profile_id: string }>(
    db,
    'UPDATE email_verification SET used_at = $2 WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2 RETURNING profile_id',
    [sha256(token), now],
  );
  if (!spent) return null;
  await run(db, 'UPDATE profile SET email_verified_at = COALESCE(email_verified_at, $2) WHERE id = $1', [spent.profile_id, now]);
  return (await get<{ email: string }>(db, 'SELECT email FROM profile WHERE id = $1', [spent.profile_id]))!.email;
}

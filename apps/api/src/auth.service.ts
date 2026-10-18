import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { sendMail, type Mail } from './mail.ts';
import { hashSecret, verifySecret } from './secret.ts';
import { SESSION_DAYS } from './session.ts';

export interface Session {
  id: string;
  remember: boolean;
  profileId: string;
  name: string;
  username: string;
  role: 'reader' | 'parent';
  color: string;
  email: string | null;
  theme: string;
}

interface ProfileRow {
  id: string;
  name: string;
  username: string;
  role: 'reader' | 'parent';
  color: string;
  email: string | null;
  household_id: string;
  password_hash: string | null;
}

const PROFILE_COLUMNS = 'id, name, username, role, color, email, household_id, password_hash';

// Verified against when the username is unknown, so both failures take the same time.
const DUMMY_HASH = hashSecret('not-a-real-password');

/**
 * Creates a session for the profile. A remembered session's cookie outlives the browser; an
 * unremembered one ends with it. Both rows idle out after SESSION_DAYS of no requests.
 */
export function createSession(db: DatabaseSync, profile: Omit<ProfileRow, 'password_hash'>, remember = true): Session {
  const id = randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO session (id, profile_id, created_at, expires_at, remember) VALUES (?, ?, ?, ?, ?)').run(
    id,
    profile.id,
    now.toISOString(),
    expires.toISOString(),
    remember ? 1 : 0,
  );
  const { theme } = db.prepare('SELECT theme FROM household WHERE id = ?').get(profile.household_id) as { theme: string };
  return {
    id,
    remember,
    profileId: profile.id,
    name: profile.name,
    username: profile.username,
    role: profile.role,
    color: profile.color,
    email: profile.email,
    theme,
  };
}

export function findProfileByUsername(db: DatabaseSync, username: string): ProfileRow | undefined {
  return db.prepare(`SELECT ${PROFILE_COLUMNS} FROM profile WHERE lower(username) = lower(?)`).get(username) as ProfileRow | undefined;
}

/** Signs a parent or a reader in. An unknown username and a wrong password fail the same way. */
export function signInWithPassword(db: DatabaseSync, username: string, password: string, remember: boolean): Session | null {
  const profile = findProfileByUsername(db, username);
  const valid = verifySecret(password, profile?.password_hash ?? DUMMY_HASH);
  return profile && profile.password_hash && valid ? createSession(db, profile, remember) : null;
}

const RESET_HOURS = 1;
export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Mails a reset link when the address belongs to a parent; says nothing either way. */
export async function requestPasswordReset(db: DatabaseSync, email: string, mail: Mail = sendMail) {
  const profile = db.prepare("SELECT id FROM profile WHERE email = ? AND role = 'parent'").get(email.toLowerCase()) as { id: string } | undefined;
  if (!profile) return;
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO password_reset (token_hash, profile_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), profile.id, expires);
  const link = `${process.env.APP_URL ?? 'http://localhost:4200'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  await mail(email, 'Choose a new Shelfie password', `Use this link to choose a new password. It works once, for ${RESET_HOURS} hour.\n\n${link}\n`);
}

/** Spends a reset token: sets the new password, ends every session of the parent and signs them in. Null when the link is used or expired. */
export function resetPassword(db: DatabaseSync, token: string, password: string): Session | null {
  const reset = db
    .prepare('SELECT token_hash, profile_id FROM password_reset WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .get(sha256(token), new Date().toISOString()) as { token_hash: string; profile_id: string } | undefined;
  if (!reset) return null;
  const profile = db.prepare(`SELECT ${PROFILE_COLUMNS} FROM profile WHERE id = ?`).get(reset.profile_id) as unknown as ProfileRow;

  db.exec('BEGIN');
  try {
    db.prepare('UPDATE profile SET password_hash = ? WHERE id = ?').run(hashSecret(password), profile.id);
    db.prepare('UPDATE password_reset SET used_at = ? WHERE token_hash = ?').run(new Date().toISOString(), reset.token_hash);
    db.prepare('DELETE FROM session WHERE profile_id = ?').run(profile.id);
    const session = createSession(db, profile);
    db.exec('COMMIT');
    return session;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

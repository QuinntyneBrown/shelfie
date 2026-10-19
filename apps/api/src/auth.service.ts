import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { get, run, transaction, type Db } from './db.ts';
import { sendMail, type Mail } from './mail.ts';
import { renderMail } from './mail-template.ts';
import { Problem } from './problem.ts';
import { photoUrl } from './photos.service.ts';
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
  photo: string | null;
  /** Whether the household has finished or skipped the set-up wizard (L2-137). */
  onboarded: boolean;
  /** Whether the person's e-mail is confirmed (L2-146); false for a parent who has not opened the link, and for readers. */
  emailVerified: boolean;
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
  email_verified_at: string | null;
}

const PROFILE_COLUMNS = 'id, name, username, role, color, email, household_id, password_hash, email_verified_at';

// Verified against when the username is unknown, so both failures take the same time.
const DUMMY_HASH = hashSecret('not-a-real-password');

/**
 * Creates a session for the profile. A remembered session's cookie outlives the browser; an
 * unremembered one ends with it. Both rows idle out after SESSION_DAYS of no requests.
 */
export async function createSession(db: Db, profile: Omit<ProfileRow, 'password_hash'>, remember = true): Promise<Session> {
  const id = randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await run(db, 'INSERT INTO session (id, profile_id, created_at, expires_at, remember) VALUES ($1, $2, $3, $4, $5)', [
    id,
    profile.id,
    now.toISOString(),
    expires.toISOString(),
    remember ? 1 : 0,
  ]);
  const { theme, onboarded } = (await get<{ theme: string; onboarded: boolean }>(db, 'SELECT theme, onboarded FROM household WHERE id = $1', [profile.household_id]))!;
  const photo = await get<{ etag: string }>(db, 'SELECT etag FROM profile_photo WHERE profile_id = $1', [profile.id]);
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
    photo: photo ? photoUrl(profile.id, photo.etag) : null,
    onboarded,
    emailVerified: profile.email_verified_at !== null,
  };
}

export function findProfileByUsername(db: Db, username: string): Promise<ProfileRow | undefined> {
  return get<ProfileRow>(db, `SELECT ${PROFILE_COLUMNS} FROM profile WHERE lower(username) = lower($1)`, [username]);
}

/** Signs a parent or a reader in. An unknown username and a wrong password fail the same way. */
export async function signInWithPassword(db: Db, username: string, password: string, remember: boolean): Promise<Session | null> {
  const profile = await findProfileByUsername(db, username);
  const valid = verifySecret(password, profile?.password_hash ?? DUMMY_HASH);
  return profile && profile.password_hash && valid ? createSession(db, profile, remember) : null;
}

export interface SignUpInput {
  name: string;
  email: string;
  username: string;
  password: string;
}

/** Which of a new account's username and e-mail another parent or reader already holds. */
export async function takenFields(db: Db, username: string, email: string | null, exceptId = ''): Promise<string[]> {
  const taken: string[] = [];
  if (email && (await get(db, 'SELECT 1 FROM profile WHERE email = $1 AND id != $2', [email, exceptId]))) taken.push('email');
  if (await get(db, 'SELECT 1 FROM profile WHERE lower(username) = lower($1) AND id != $2', [username, exceptId])) taken.push('username');
  return taken;
}

/** Starts a household with this parent as its only member and signs them in. */
export async function signUp(pool: Pool, input: SignUpInput): Promise<Session> {
  const email = input.email.trim().toLowerCase();
  const taken = await takenFields(pool, input.username, email);
  if (taken.length) throw new Problem(409, 'taken', { fields: taken });
  const passwordHash = hashSecret(input.password);
  const householdId = randomUUID();
  const parent = { id: randomUUID(), name: input.name.trim(), username: input.username, role: 'parent' as const, color: 'sky', email, household_id: householdId, email_verified_at: null };
  return transaction(pool, async (db) => {
    // A household started here goes through the set-up wizard once; every other household is already done (ADR-0018).
    await run(db, 'INSERT INTO household (id, onboarded) VALUES ($1, FALSE)', [householdId]);
    await run(db, 'INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
      parent.id,
      householdId,
      parent.role,
      parent.name,
      parent.color,
      parent.username,
      email,
      passwordHash,
    ]);
    return createSession(db, parent);
  });
}

const RESET_HOURS = 1;
export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

/** Mails a reset link when the address belongs to a parent; says nothing either way. */
export async function requestPasswordReset(db: Db, email: string, mail: Mail = sendMail) {
  const profile = await get<{ id: string }>(db, "SELECT id FROM profile WHERE email = $1 AND role = 'parent'", [email.toLowerCase()]);
  if (!profile) return;
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000).toISOString();
  await run(db, 'INSERT INTO password_reset (token_hash, profile_id, expires_at) VALUES ($1, $2, $3)', [sha256(token), profile.id, expires]);
  const link = `${process.env.APP_URL ?? 'http://localhost:4200'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  const { html, text } = renderMail({
    heading: 'Choose a new password',
    paragraphs: [`Use this link to choose a new password. It works once, for ${RESET_HOURS} hour.`],
    button: { label: 'Choose a new password', url: link },
    footer: 'You got this because someone asked to reset the password for this address. If it wasn’t you, ignore this e-mail; your password stays the same.',
  });
  await mail(email, 'Choose a new Shelfie password', text, html);
}

/** Spends a reset token: sets the new password, ends every session of the parent and signs them in. Null when the link is used or expired. */
export async function resetPassword(pool: Pool, token: string, password: string): Promise<Session | null> {
  const reset = await get<{ token_hash: string; profile_id: string }>(
    pool,
    'SELECT token_hash, profile_id FROM password_reset WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2',
    [sha256(token), new Date().toISOString()],
  );
  if (!reset) return null;
  const profile = (await get<ProfileRow>(pool, `SELECT ${PROFILE_COLUMNS} FROM profile WHERE id = $1`, [reset.profile_id]))!;

  return transaction(pool, async (db) => {
    await run(db, 'UPDATE profile SET password_hash = $1 WHERE id = $2', [hashSecret(password), profile.id]);
    await run(db, 'UPDATE password_reset SET used_at = $1 WHERE token_hash = $2', [new Date().toISOString(), reset.token_hash]);
    await run(db, 'DELETE FROM session WHERE profile_id = $1', [profile.id]);
    return createSession(db, profile);
  });
}

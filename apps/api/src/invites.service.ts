import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { get, run, transaction, type Db } from './db.ts';
import { createSession, sha256, takenFields, type Session } from './auth.service.ts';
import { sendMail, type Mail } from './mail.ts';
import { renderMail } from './mail-template.ts';
import { Problem } from './problem.ts';
import { hashSecret } from './secret.ts';
import type { InviteView } from './settings.service.ts';

const INVITE_DAYS = 7;

/**
 * Mails a single-use, 7-day invite link to the address and keeps only the token's hash. An unused
 * invite to the same address from this household is replaced, so Send again mails a fresh link.
 * A failed send leaves no pending invite.
 */
export async function createInvite(db: Pool, householdId: string, invitedBy: string, email: string, mail: Mail = sendMail): Promise<InviteView> {
  email = email.trim().toLowerCase();
  if (await get(db, 'SELECT 1 FROM profile WHERE email = $1', [email])) throw new Problem(409, 'email-in-use');
  const inviter = (await get<{ name: string }>(db, 'SELECT name FROM profile WHERE id = $1', [invitedBy]))!;
  const token = randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await run(db, 'DELETE FROM invites WHERE household_id = $1 AND email = $2 AND used_at IS NULL', [householdId, email]);
  await run(db, 'INSERT INTO invites (token_hash, email, household_id, invited_by, expires_at) VALUES ($1, $2, $3, $4, $5)', [
    tokenHash,
    email,
    householdId,
    invitedBy,
    expiresAt,
  ]);
  const link = `${process.env.APP_URL ?? 'http://localhost:4200'}/accept-invite?token=${token}`;
  const { html, text } = renderMail({
    heading: `Join ${inviter.name} on Shelfie`,
    paragraphs: [`${inviter.name} invited you to join their household on Shelfie. Use this link to create your parent account. It works once, for ${INVITE_DAYS} days.`],
    button: { label: 'Create my account', url: link },
    footer: `You got this because ${inviter.name} typed your address into Shelfie. If you don’t know them, ignore this e-mail and nothing happens.`,
  });
  try {
    await mail(email, `${inviter.name} invited you to Shelfie`, text, html);
  } catch (e) {
    await run(db, 'DELETE FROM invites WHERE token_hash = $1', [tokenHash]);
    throw e;
  }
  return { id: tokenHash, email, sentAt: new Date().toISOString(), expiresAt };
}

export interface InviteSummary {
  email: string;
  invitedBy: string;
}

interface InviteRow {
  token_hash: string;
  email: string;
  household_id: string;
  invitedBy: string;
}

function findLiveInvite(db: Db, token: string): Promise<InviteRow | undefined> {
  return get<InviteRow>(
    db,
    `SELECT i.token_hash, i.email, i.household_id, p.name AS "invitedBy"
       FROM invites i JOIN profile p ON p.id = i.invited_by
      WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > $2`,
    [sha256(token), new Date().toISOString()],
  );
}

/**
 * Who sent the invite and to whom, for the Join page. A used or expired link fails with the inviter's
 * name, so the page can say whom to ask for a new one; an unknown link fails without it.
 */
export async function getInvite(db: Db, token: string): Promise<InviteSummary> {
  const invite = await findLiveInvite(db, token);
  if (invite) return { email: invite.email, invitedBy: invite.invitedBy };
  const spent = await get<{ invitedBy: string }>(
    db,
    'SELECT p.name AS "invitedBy" FROM invites i JOIN profile p ON p.id = i.invited_by WHERE i.token_hash = $1',
    [sha256(token)],
  );
  throw new Problem(400, 'invite-invalid', spent ? { invitedBy: spent.invitedBy } : {});
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  username: string;
  password: string;
}

/** Creates the parent in the inviting household, spends the invite and signs the parent in. */
export async function acceptInvite(pool: Pool, input: AcceptInviteInput): Promise<Session> {
  const invite = await findLiveInvite(pool, input.token);
  if (!invite) throw new Problem(400, 'invite-invalid');
  const taken = await takenFields(pool, input.username, invite.email);
  if (taken.includes('email')) throw new Problem(409, 'email-taken');
  if (taken.includes('username')) throw new Problem(409, 'username-taken');
  const parent = { id: randomUUID(), name: input.name.trim(), username: input.username, role: 'parent' as const, color: 'lilac', email: invite.email, household_id: invite.household_id };
  const passwordHash = hashSecret(input.password);
  return transaction(pool, async (db) => {
    await run(db, 'INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
      parent.id,
      parent.household_id,
      parent.role,
      parent.name,
      parent.color,
      parent.username,
      parent.email,
      passwordHash,
    ]);
    await run(db, 'UPDATE invites SET used_at = $1 WHERE token_hash = $2', [new Date().toISOString(), invite.token_hash]);
    return createSession(db, parent);
  });
}

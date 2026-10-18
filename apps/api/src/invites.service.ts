import { randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { createSession, sha256, takenFields, type Session } from './auth.service.ts';
import { sendMail, type Mail } from './mail.ts';
import { Problem } from './problem.ts';
import { hashSecret } from './secret.ts';
import type { InviteView } from './settings.service.ts';

const INVITE_DAYS = 7;

/**
 * Mails a single-use, 7-day invite link to the address and keeps only the token's hash. An unused
 * invite to the same address from this household is replaced, so Send again mails a fresh link.
 * A failed send leaves no pending invite.
 */
export async function createInvite(db: DatabaseSync, householdId: string, invitedBy: string, email: string, mail: Mail = sendMail): Promise<InviteView> {
  email = email.trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM profile WHERE email = ?').get(email)) throw new Problem(409, 'email-in-use');
  const inviter = db.prepare('SELECT name FROM profile WHERE id = ?').get(invitedBy) as { name: string };
  const token = randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM invites WHERE household_id = ? AND email = ? AND used_at IS NULL').run(householdId, email);
  db.prepare('INSERT INTO invites (token_hash, email, household_id, invited_by, expires_at) VALUES (?, ?, ?, ?, ?)').run(
    tokenHash,
    email,
    householdId,
    invitedBy,
    expiresAt,
  );
  const link = `${process.env.APP_URL ?? 'http://localhost:4200'}/accept-invite?token=${token}`;
  try {
    await mail(
      email,
      `${inviter.name} invited you to Shelfie`,
      `${inviter.name} invited you to join their household on Shelfie. Use this link to create your parent account. It works once, for ${INVITE_DAYS} days.\n\n${link}\n`,
    );
  } catch (e) {
    db.prepare('DELETE FROM invites WHERE token_hash = ?').run(tokenHash);
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

function findLiveInvite(db: DatabaseSync, token: string): InviteRow | undefined {
  return db
    .prepare(
      'SELECT i.token_hash, i.email, i.household_id, p.name AS invitedBy FROM invites i JOIN profile p ON p.id = i.invited_by WHERE i.token_hash = ? AND i.used_at IS NULL AND i.expires_at > ?',
    )
    .get(sha256(token), new Date().toISOString()) as InviteRow | undefined;
}

/**
 * Who sent the invite and to whom, for the Join page. A used or expired link fails with the inviter's
 * name, so the page can say whom to ask for a new one; an unknown link fails without it.
 */
export function getInvite(db: DatabaseSync, token: string): InviteSummary {
  const invite = findLiveInvite(db, token);
  if (invite) return { email: invite.email, invitedBy: invite.invitedBy };
  const spent = db
    .prepare('SELECT p.name AS invitedBy FROM invites i JOIN profile p ON p.id = i.invited_by WHERE i.token_hash = ?')
    .get(sha256(token)) as { invitedBy: string } | undefined;
  throw new Problem(400, 'invite-invalid', spent ? { invitedBy: spent.invitedBy } : {});
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  username: string;
  password: string;
}

/** Creates the parent in the inviting household, spends the invite and signs the parent in. */
export function acceptInvite(db: DatabaseSync, input: AcceptInviteInput): Session {
  const invite = findLiveInvite(db, input.token);
  if (!invite) throw new Problem(400, 'invite-invalid');
  const taken = takenFields(db, input.username, invite.email);
  if (taken.includes('email')) throw new Problem(409, 'email-taken');
  if (taken.includes('username')) throw new Problem(409, 'username-taken');
  const parent = { id: randomUUID(), name: input.name.trim(), username: input.username, role: 'parent' as const, color: 'lilac', email: invite.email, household_id: invite.household_id };
  const passwordHash = hashSecret(input.password);
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO profile (id, household_id, role, name, color, username, email, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      parent.id,
      parent.household_id,
      parent.role,
      parent.name,
      parent.color,
      parent.username,
      parent.email,
      passwordHash,
    );
    db.prepare('UPDATE invites SET used_at = ? WHERE token_hash = ?').run(new Date().toISOString(), invite.token_hash);
    const session = createSession(db, parent);
    db.exec('COMMIT');
    return session;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

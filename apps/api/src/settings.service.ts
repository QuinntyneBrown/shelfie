import type { DatabaseSync } from 'node:sqlite';
import { Problem } from './problem.ts';
import { hashSecret, verifySecret } from './secret.ts';

export interface ParentView {
  id: string;
  name: string;
  username: string;
  color: string;
}

export interface InviteView {
  id: string;
  email: string;
  sentAt: string;
  expiresAt: string;
}

export interface ReaderView {
  id: string;
  name: string;
  color: string;
  username: string;
}

export interface SettingsView {
  account: { name: string; username: string; email: string };
  theme: string;
  parents: ParentView[];
  invites: InviteView[];
  readers: ReaderView[];
}

export function listReaders(db: DatabaseSync, householdId: string): ReaderView[] {
  return db
    .prepare("SELECT id, name, color, username FROM profile WHERE household_id = ? AND role = 'reader' ORDER BY name")
    .all(householdId) as unknown as ReaderView[];
}

export function listPendingInvites(db: DatabaseSync, householdId: string): InviteView[] {
  return db
    .prepare(
      "SELECT token_hash AS id, email, datetime(expires_at, '-7 days') AS sentAt, expires_at AS expiresAt FROM invites WHERE household_id = ? AND used_at IS NULL AND expires_at > ? ORDER BY expires_at",
    )
    .all(householdId, new Date().toISOString()) as unknown as InviteView[];
}

export function getSettings(db: DatabaseSync, householdId: string, profileId: string): SettingsView {
  const account = db.prepare('SELECT name, username, email FROM profile WHERE id = ?').get(profileId) as SettingsView['account'];
  const { theme } = db.prepare('SELECT theme FROM household WHERE id = ?').get(householdId) as { theme: string };
  const parents = db
    .prepare("SELECT id, name, username, color FROM profile WHERE household_id = ? AND role = 'parent' ORDER BY id = ? DESC, name")
    .all(householdId, profileId) as unknown as ParentView[];
  return { account, theme, parents, invites: listPendingInvites(db, householdId), readers: listReaders(db, householdId) };
}

export interface SettingsPatch {
  theme: string;
  account: { name: string; email: string; newPassword?: string; currentPassword?: string };
}

export function updateSettings(db: DatabaseSync, householdId: string, profileId: string, patch: SettingsPatch): SettingsView {
  const stored = db.prepare('SELECT email, password_hash FROM profile WHERE id = ?').get(profileId) as { email: string; password_hash: string };
  const email = patch.account.email.trim().toLowerCase();
  const changingEmail = email !== stored.email;
  if (changingEmail || patch.account.newPassword) {
    if (!patch.account.currentPassword || !verifySecret(patch.account.currentPassword, stored.password_hash)) {
      throw new Problem(400, 'current-password-invalid');
    }
  }
  if (changingEmail && db.prepare('SELECT 1 FROM profile WHERE email = ? AND id != ?').get(email, profileId)) {
    throw new Problem(409, 'email-in-use');
  }
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE profile SET name = ?, email = ? WHERE id = ?').run(patch.account.name, email, profileId);
    if (patch.account.newPassword) {
      db.prepare('UPDATE profile SET password_hash = ? WHERE id = ?').run(hashSecret(patch.account.newPassword), profileId);
    }
    db.prepare('UPDATE household SET theme = ? WHERE id = ?').run(patch.theme, householdId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return getSettings(db, householdId, profileId);
}

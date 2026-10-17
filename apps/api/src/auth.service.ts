import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { verifyPin } from './pin.ts';

const SESSION_DAYS = 30;

export interface ProfileSummary {
  id: string;
  name: string;
  role: 'reader' | 'grown_up';
  color: string;
}

export interface Session {
  id: string;
  profileId: string;
  name: string;
  role: 'reader' | 'grown_up';
}

export function listProfiles(db: DatabaseSync, householdId: string): ProfileSummary[] {
  return db
    .prepare('SELECT id, name, role, color FROM profile WHERE household_id = ? ORDER BY role DESC')
    .all(householdId) as unknown as ProfileSummary[];
}

export function signInWithPin(db: DatabaseSync, householdId: string, profileId: string, pin: string): Session | null {
  const profile = db
    .prepare("SELECT id, name, role, pin_hash FROM profile WHERE id = ? AND household_id = ? AND role = 'reader'")
    .get(profileId, householdId) as { id: string; name: string; role: 'reader'; pin_hash: string | null } | undefined;
  if (!profile?.pin_hash || !verifyPin(pin, profile.pin_hash)) return null;

  const id = randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO session (id, profile_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    profile.id,
    now.toISOString(),
    expires.toISOString(),
  );
  return { id, profileId: profile.id, name: profile.name, role: profile.role };
}

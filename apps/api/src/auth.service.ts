import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { verifyPin } from './pin.ts';

const SESSION_DAYS = 30;
const MAX_FAILURES = 5;
const LOCK_MINUTES = 5;

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

export type PinResult = { session: Session } | { triesLeft: number } | { lockedUntil: string };

export function signInWithPin(db: DatabaseSync, householdId: string, profileId: string, pin: string): PinResult {
  const profile = db
    .prepare("SELECT id, name, role, pin_hash, pin_failed_count, pin_locked_until FROM profile WHERE id = ? AND household_id = ? AND role = 'reader'")
    .get(profileId, householdId) as { id: string; name: string; role: 'reader'; pin_hash: string | null; pin_failed_count: number; pin_locked_until: string | null } | undefined;
  if (!profile?.pin_hash) return { triesLeft: MAX_FAILURES };
  if (profile.pin_locked_until && profile.pin_locked_until > new Date().toISOString()) {
    return { lockedUntil: profile.pin_locked_until };
  }
  if (!verifyPin(pin, profile.pin_hash)) {
    const failed = profile.pin_failed_count + 1;
    if (failed >= MAX_FAILURES) {
      const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
      db.prepare('UPDATE profile SET pin_failed_count = 0, pin_locked_until = ? WHERE id = ?').run(lockedUntil, profile.id);
      return { lockedUntil };
    }
    db.prepare('UPDATE profile SET pin_failed_count = ? WHERE id = ?').run(failed, profile.id);
    return { triesLeft: MAX_FAILURES - failed };
  }
  db.prepare('UPDATE profile SET pin_failed_count = 0 WHERE id = ?').run(profile.id);

  const id = randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO session (id, profile_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    profile.id,
    now.toISOString(),
    expires.toISOString(),
  );
  return { session: { id, profileId: profile.id, name: profile.name, role: profile.role } };
}

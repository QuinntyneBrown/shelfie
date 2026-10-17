import { randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { hashSecret, verifySecret } from './secret.ts';
import { SESSION_DAYS } from './session.ts';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 5;

export interface ProfileSummary {
  id: string;
  name: string;
  role: 'reader' | 'grown_up';
  color: string;
  email: string | null;
  theme: string;
}

export interface Session {
  id: string;
  profileId: string;
  name: string;
  role: 'reader' | 'grown_up';
  color: string;
  email: string | null;
  theme: string;
}

export type PinResult = { session: Session } | { triesLeft: number } | { lockedUntil: string };

// Verified against when the e-mail is unknown, so both failures take the same time.
const DUMMY_HASH = hashSecret('not-a-real-password');

function createSession(
  db: DatabaseSync,
  profile: { id: string; name: string; role: 'reader' | 'grown_up'; color: string; email: string | null },
): Session {
  const id = randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO session (id, profile_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    profile.id,
    now.toISOString(),
    expires.toISOString(),
  );
  const { theme } = db
    .prepare('SELECT h.theme AS theme FROM household h JOIN profile p ON p.household_id = h.id WHERE p.id = ?')
    .get(profile.id) as { theme: string };
  return { id, profileId: profile.id, name: profile.name, role: profile.role, color: profile.color, email: profile.email, theme };
}

export function listProfiles(db: DatabaseSync, householdId: string): ProfileSummary[] {
  return db
    .prepare('SELECT p.id, p.name, p.role, p.color, p.email, h.theme FROM profile p JOIN household h ON h.id = p.household_id WHERE p.household_id = ? ORDER BY p.role DESC')
    .all(householdId) as unknown as ProfileSummary[];
}

export function signInWithPassword(db: DatabaseSync, email: string, password: string): (Session & { householdId: string }) | null {
  const profile = db
    .prepare("SELECT id, name, role, color, email, household_id, password_hash FROM profile WHERE email = ? AND role = 'grown_up'")
    .get(email) as { id: string; name: string; role: 'grown_up'; color: string; email: string | null; household_id: string; password_hash: string | null } | undefined;
  const valid = verifySecret(password, profile?.password_hash ?? DUMMY_HASH);
  return profile && valid ? { ...createSession(db, profile), householdId: profile.household_id } : null;
}

export function signInWithPin(db: DatabaseSync, householdId: string, profileId: string, pin: string): PinResult {
  const profile = db
    .prepare(
      "SELECT id, name, role, color, email, pin_hash, pin_failed_count, pin_locked_until FROM profile WHERE id = ? AND household_id = ? AND role = 'reader'",
    )
    .get(profileId, householdId) as
    | {
        id: string;
        name: string;
        role: 'reader';
        color: string;
        email: string | null;
        pin_hash: string | null;
        pin_failed_count: number;
        pin_locked_until: string | null;
      }
    | undefined;
  if (!profile?.pin_hash) return { triesLeft: MAX_FAILURES };
  if (profile.pin_locked_until && profile.pin_locked_until > new Date().toISOString()) {
    return { lockedUntil: profile.pin_locked_until };
  }
  if (!verifySecret(pin, profile.pin_hash)) {
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
  return { session: createSession(db, profile) };
}

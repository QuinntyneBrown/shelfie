import type { DatabaseSync } from 'node:sqlite';
import { Problem } from './problem.ts';
import { hashSecret, verifySecret } from './secret.ts';

export interface SettingsView {
  reader: { name: string; color: string };
  grownUp: { name: string; email: string };
}

export function getSettings(db: DatabaseSync, householdId: string): SettingsView {
  const profile = (role: string) =>
    db.prepare('SELECT name, color, email FROM profile WHERE household_id = ? AND role = ?').get(householdId, role) as {
      name: string;
      color: string;
      email: string;
    };
  const reader = profile('reader');
  const grownUp = profile('grown_up');
  return { reader: { name: reader.name, color: reader.color }, grownUp: { name: grownUp.name, email: grownUp.email } };
}

export interface SettingsPatch {
  reader: { name: string; color: string; pin?: string };
  grownUp: { name: string; newPassword?: string; currentPassword?: string };
}

export function updateSettings(db: DatabaseSync, householdId: string, profileId: string, patch: SettingsPatch): SettingsView {
  if (patch.grownUp.newPassword) {
    const { password_hash } = db.prepare('SELECT password_hash FROM profile WHERE id = ?').get(profileId) as { password_hash: string };
    if (!patch.grownUp.currentPassword || !verifySecret(patch.grownUp.currentPassword, password_hash)) {
      throw new Problem(400, 'current-password-invalid');
    }
  }
  db.exec('BEGIN');
  try {
    const update = db.prepare('UPDATE profile SET name = ?, color = COALESCE(?, color) WHERE household_id = ? AND role = ?');
    update.run(patch.reader.name, patch.reader.color, householdId, 'reader');
    update.run(patch.grownUp.name, null, householdId, 'grown_up');
    if (patch.grownUp.newPassword) {
      db.prepare('UPDATE profile SET password_hash = ? WHERE id = ?').run(hashSecret(patch.grownUp.newPassword), profileId);
    }
    if (patch.reader.pin) {
      db.prepare("UPDATE profile SET pin_hash = ?, pin_failed_count = 0, pin_locked_until = NULL WHERE household_id = ? AND role = 'reader'").run(
        hashSecret(patch.reader.pin),
        householdId,
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return getSettings(db, householdId);
}

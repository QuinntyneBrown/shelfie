import type { DatabaseSync } from 'node:sqlite';

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
  reader: { name: string; color: string };
  grownUp: { name: string };
}

export function updateSettings(db: DatabaseSync, householdId: string, patch: SettingsPatch): SettingsView {
  db.exec('BEGIN');
  try {
    const update = db.prepare('UPDATE profile SET name = ?, color = COALESCE(?, color) WHERE household_id = ? AND role = ?');
    update.run(patch.reader.name, patch.reader.color, householdId, 'reader');
    update.run(patch.grownUp.name, null, householdId, 'grown_up');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return getSettings(db, householdId);
}

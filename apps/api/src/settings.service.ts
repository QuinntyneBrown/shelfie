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

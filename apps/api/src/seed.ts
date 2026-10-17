import { openDb } from './db.ts';
import { hashPin } from './pin.ts';

export const SEED = {
  householdId: 'h1',
  readerId: 'p-nia',
  grownUpId: 'p-dad',
  pin: '1234',
};

const db = openDb(process.env.SHELFIE_DB ?? 'shelfie.db');
db.exec('DELETE FROM session');
db.prepare("INSERT OR REPLACE INTO household (id, time_zone) VALUES (?, 'UTC')").run(SEED.householdId);
const profile = db.prepare(
  'INSERT OR REPLACE INTO profile (id, household_id, role, name, color, pin_hash) VALUES (?, ?, ?, ?, ?, ?)',
);
profile.run(SEED.readerId, SEED.householdId, 'reader', 'Nia', 'rose', hashPin(SEED.pin));
profile.run(SEED.grownUpId, SEED.householdId, 'grown_up', 'Dad', 'sky', null);
console.log('seeded');

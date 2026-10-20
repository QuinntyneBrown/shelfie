import { get, run, type Db } from './db.ts';

/** The household's healing activity, or null when healing is off (ADR-0021). */
export async function healingOf(db: Db, householdId: string): Promise<{ activity: string | null }> {
  const row = await get<{ healing_activity: string | null }>(db, 'SELECT healing_activity FROM household WHERE id = $1', [householdId]);
  return { activity: row?.healing_activity ?? null };
}

export async function setHealingActivity(db: Db, householdId: string, name: string): Promise<{ activity: string | null }> {
  await run(db, 'UPDATE household SET healing_activity = $1 WHERE id = $2', [name, householdId]);
  return healingOf(db, householdId);
}

/** Turns healing off; days already healed stay healed. */
export async function clearHealingActivity(db: Db, householdId: string): Promise<void> {
  await run(db, 'UPDATE household SET healing_activity = NULL WHERE id = $1', [householdId]);
}

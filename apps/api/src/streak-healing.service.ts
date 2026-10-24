import { get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { dayBefore, mondayOf, readingDays, streakFor, type Heal } from './streak.ts';

const UNIQUE_VIOLATION = '23505';

/** Newest first: the 7 days before today with no chapter whose Monday-to-Sunday week has no heal (ADR-0021). */
export function healableDays(readOnDays: string[], heals: Heal[], today: string): string[] {
  const read = new Set(readOnDays);
  const healedWeeks = new Set(heals.map((h) => mondayOf(h.day)));
  const days: string[] = [];
  for (let day = dayBefore(today), i = 0; i < 7; day = dayBefore(day), i++) {
    if (!read.has(day) && !healedWeeks.has(mondayOf(day))) days.push(day);
  }
  return days;
}

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

/** The day Review offers to heal: the latest healable one, or null when healing is off or none is. */
export async function healOffer(db: Db, householdId: string, now = new Date()): Promise<Heal | null> {
  const { activity } = await healingOf(db, householdId);
  if (!activity) return null;
  const { days, heals, today } = await readingDays(db, householdId, now);
  const [day] = healableDays(days, heals, today);
  return day ? { day, activity } : null;
}

/** Heals one day with the activity, once per week; answers the streak it makes. */
export async function healDay(db: Db, householdId: string, day: string, now = new Date()): Promise<{ day: string; streak: number }> {
  const { activity } = await healingOf(db, householdId);
  const { days, today } = await readingDays(db, householdId, now);
  const healable = healableDays(days, [], today);
  if (!activity || !healable.includes(day)) throw new Problem(400, 'not-healable');
  try {
    await run(db, 'INSERT INTO streak_heal (household_id, healed_on, week_of, activity, healed_at) VALUES ($1, $2, $3, $4, $5)', [
      householdId,
      day,
      mondayOf(day),
      activity,
      now.toISOString(),
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === UNIQUE_VIOLATION) throw new Problem(409, 'already-healed-this-week');
    throw e;
  }
  return { day, streak: await streakFor(db, householdId, now) };
}

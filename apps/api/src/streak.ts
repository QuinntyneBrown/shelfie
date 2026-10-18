import { all, get, type Db } from './db.ts';

const dayBefore = (isoDay: string) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

/**
 * Consecutive days with at least one chapter read, counting back from today. A streak that has
 * nothing today but something yesterday keeps its value until today ends.
 */
export function computeStreak(readOnDays: string[], today: string): number {
  const days = new Set(readOnDays);
  let day = days.has(today) ? today : dayBefore(today);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = dayBefore(day);
  }
  return streak;
}

/** The calendar day it is in a time zone at a moment. */
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

export async function streakFor(db: Db, householdId: string, now = new Date()): Promise<number> {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const days = await all<{ read_on: string }>(
    db,
    'SELECT DISTINCT c.read_on FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1',
    [householdId],
  );
  return computeStreak(
    days.map((d) => d.read_on),
    todayIn(time_zone, now),
  );
}

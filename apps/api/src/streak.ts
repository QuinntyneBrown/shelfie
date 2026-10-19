import { all, get, type Db } from './db.ts';

export const dayBefore = (isoDay: string) => {
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

export interface WeekDay {
  date: string;
  read: boolean;
  today: boolean;
}

/** This week, Monday to Sunday, with the days a chapter was read and today marked. */
export function computeWeek(readOnDays: string[], today: string): WeekDay[] {
  const days = new Set(readOnDays);
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + i);
    const day = date.toISOString().slice(0, 10);
    return { date: day, read: days.has(day), today: day === today };
  });
}

/** The calendar day it is in a time zone at a moment. */
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

async function readingDays(db: Db, householdId: string, now: Date) {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const days = await all<{ read_on: string }>(
    db,
    'SELECT DISTINCT c.read_on FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1',
    [householdId],
  );
  return { days: days.map((d) => d.read_on), today: todayIn(time_zone, now) };
}

export async function streakFor(db: Db, householdId: string, now = new Date()): Promise<number> {
  const { days, today } = await readingDays(db, householdId, now);
  return computeStreak(days, today);
}

export async function weekFor(db: Db, householdId: string, now = new Date()): Promise<WeekDay[]> {
  const { days, today } = await readingDays(db, householdId, now);
  return computeWeek(days, today);
}

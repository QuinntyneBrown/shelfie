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
  /** The activity a parent healed this day with, when no chapter was read on it (ADR-0021). */
  healed: string | null;
  today: boolean;
}

/** A day the parent healed, with the activity's name at the time. */
export interface Heal {
  day: string;
  activity: string;
}

/** The Monday of a day's Monday-to-Sunday week. */
export function mondayOf(isoDay: string): string {
  const monday = new Date(`${isoDay}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

/** This week, Monday to Sunday, with the days a chapter was read, the days healed instead and today marked. */
export function computeWeek(readOnDays: string[], today: string, heals: Heal[] = []): WeekDay[] {
  const days = new Set(readOnDays);
  const monday = new Date(`${mondayOf(today)}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + i);
    const day = date.toISOString().slice(0, 10);
    const read = days.has(day);
    return { date: day, read, healed: read ? null : (heals.find((h) => h.day === day)?.activity ?? null), today: day === today };
  });
}

/** The calendar day it is in a time zone at a moment. */
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

/** The household's read days and healed days, and today in its time zone. */
export async function readingDays(db: Db, householdId: string, now: Date) {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const days = await all<{ read_on: string }>(
    db,
    'SELECT DISTINCT c.read_on FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1',
    [householdId],
  );
  const heals = await all<Heal>(db, 'SELECT healed_on AS day, activity FROM streak_heal WHERE household_id = $1', [householdId]);
  return { days: days.map((d) => d.read_on), heals, today: todayIn(time_zone, now) };
}

/** The streak, with healed days counted as read (ADR-0021). */
export async function streakFor(db: Db, householdId: string, now = new Date()): Promise<number> {
  const { days, heals, today } = await readingDays(db, householdId, now);
  return computeStreak([...days, ...heals.map((h) => h.day)], today);
}

/** This week; the chapter success card asks without heals, because its row is her own reading (L2-163). */
export async function weekFor(db: Db, householdId: string, now = new Date(), withHeals = true): Promise<WeekDay[]> {
  const { days, heals, today } = await readingDays(db, householdId, now);
  return computeWeek(days, today, withHeals ? heals : []);
}

import { all, get, type Db } from './db.ts';
import { dayBefore, todayIn } from './streak.ts';

export interface Badge {
  id: 'first-book' | 'double-chapter' | 'weekend-reader' | 'week-streak';
  icon: string;
  name: string;
  hint: string;
  earned: boolean;
  /** The day the feat first happened (YYYY-MM-DD); null while the badge is locked. */
  earnedOn: string | null;
}

const SUNDAY = 0;

/** The four badges, in the order they are shown, each earned on the day its feat first happened. */
export function computeBadges(readOnDays: string[], finishedDays: string[]): Badge[] {
  const perDay = new Map<string, number>();
  for (const day of readOnDays) perDay.set(day, (perDay.get(day) ?? 0) + 1);
  const days = [...perDay.keys()].sort();

  const firstBook = [...finishedDays].sort()[0] ?? null;
  const doubleChapter = days.find((day) => perDay.get(day)! >= 2) ?? null;
  const weekendReader = days.find((day) => new Date(`${day}T00:00:00Z`).getUTCDay() === SUNDAY && perDay.has(dayBefore(day))) ?? null;
  let weekStreak: string | null = null;
  let run = 0;
  for (const [index, day] of days.entries()) {
    run = index > 0 && days[index - 1] === dayBefore(day) ? run + 1 : 1;
    if (run === 7) {
      weekStreak = day;
      break;
    }
  }

  const badge = (id: Badge['id'], icon: string, name: string, hint: string, earnedOn: string | null): Badge => ({
    id,
    icon,
    name,
    hint,
    earned: earnedOn !== null,
    earnedOn,
  });
  return [
    badge('first-book', '📚', 'First book', 'Finish a whole book', firstBook),
    badge('double-chapter', '✌️', 'Double chapter', 'Read two chapters in one day', doubleChapter),
    badge('weekend-reader', '🌤️', 'Weekend reader', 'Read on a Saturday and the Sunday after', weekendReader),
    badge('week-streak', '🔥', 'Week streak', 'Read 7 days in a row', weekStreak),
  ];
}

export async function badgesFor(db: Db, householdId: string): Promise<Badge[]> {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const read = await all<{ read_on: string }>(
    db,
    'SELECT c.read_on FROM chapter_log c JOIN book b ON b.id = c.book_id WHERE b.household_id = $1',
    [householdId],
  );
  const finished = await all<{ finished_at: string }>(db, 'SELECT finished_at FROM book WHERE household_id = $1 AND finished_at IS NOT NULL', [householdId]);
  return computeBadges(
    read.map((r) => r.read_on),
    finished.map((r) => todayIn(time_zone, new Date(r.finished_at))),
  );
}

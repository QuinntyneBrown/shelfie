import { all, get, run, type Db } from './db.ts';
import { todayIn } from './streak.ts';
import { HELPER_COLUMN, readerOf, type Reader } from './together.service.ts';

/** The household's one helper reward and this round's helper minutes per reader (L2-141, L2-142). */
export interface HelperReward {
  name: string;
  targetMinutes: number;
  /** Minutes each helper has this round, by profile id; computed on read, never stored (ADR-0018). */
  minutes: Record<string, number>;
  /** The reader who reached the target this round; null until then. */
  earnedBy: Reader | null;
  /** The household day the last round was given; null before the first. */
  givenOn: string | null;
}

interface Row {
  name: string;
  target_minutes: number;
  earned_by: string | null;
  given_at: string | null;
}

/** Helper minutes per reader from the sessions not removed and logged since the last give. */
async function minutesOf(db: Db, householdId: string, givenAt: string | null): Promise<Record<string, number>> {
  const rows = await all<{ helper: string; minutes: number }>(
    db,
    `SELECT ${HELPER_COLUMN} AS helper, SUM(s.minutes) AS minutes FROM reading_session s
      WHERE s.household_id = $1 AND s.removed_at IS NULL AND s.logged_at > $2 GROUP BY 1 ORDER BY 1`,
    [householdId, givenAt ?? ''],
  );
  return Object.fromEntries(rows.map((r) => [r.helper, Number(r.minutes)]));
}

export async function helperRewardOf(db: Db, householdId: string): Promise<HelperReward | null> {
  const row = await get<Row>(db, 'SELECT name, target_minutes, earned_by, given_at FROM helper_reward WHERE household_id = $1', [householdId]);
  if (!row) return null;
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const earnedBy = row.earned_by ? await readerOf(db, row.earned_by) : null;
  return {
    name: row.name,
    targetMinutes: row.target_minutes,
    minutes: await minutesOf(db, householdId, row.given_at),
    earnedBy,
    givenOn: row.given_at ? todayIn(time_zone, new Date(row.given_at)) : null,
  };
}

/** Sets or changes the reward; the round under way and its minutes are kept. */
export async function setHelperReward(db: Db, householdId: string, name: string, targetMinutes: number): Promise<HelperReward> {
  await run(
    db,
    `INSERT INTO helper_reward (household_id, name, target_minutes) VALUES ($1, $2, $3)
       ON CONFLICT (household_id) DO UPDATE SET name = EXCLUDED.name, target_minutes = EXCLUDED.target_minutes`,
    [householdId, name, targetMinutes],
  );
  return (await helperRewardOf(db, householdId))!;
}

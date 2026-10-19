import { all, get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { streakFor, todayIn } from './streak.ts';

/** The streak lengths a parent can set a reward for. */
export const MILESTONES = [7, 30, 100];

export interface StreakReward {
  milestone: number;
  name: string | null;
  /** The household day the reward was first earned; null until then. */
  earnedOn: string | null;
  givenOn: string | null;
}

interface Row {
  milestone: number;
  name: string;
  earned_at: string | null;
  given_at: string | null;
}

/** Marks every set reward whose milestone the streak has reached; one that is already earned stays as it was (ADR-0012). */
async function earn(db: Db, householdId: string, now: Date) {
  await run(db, 'UPDATE streak_reward SET earned_at = $1 WHERE household_id = $2 AND earned_at IS NULL AND milestone <= $3', [
    now.toISOString(),
    householdId,
    await streakFor(db, householdId, now),
  ]);
}

/** The three milestones with what the parent set for each, earning first. */
export async function streakRewardsOf(db: Db, householdId: string, now = new Date()): Promise<StreakReward[]> {
  await earn(db, householdId, now);
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const rows = await all<Row>(db, 'SELECT milestone, name, earned_at, given_at FROM streak_reward WHERE household_id = $1', [householdId]);
  const dayOf = (iso: string | null) => (iso ? todayIn(time_zone, new Date(iso)) : null);
  return MILESTONES.map((milestone) => {
    const row = rows.find((r) => r.milestone === milestone);
    return { milestone, name: row?.name ?? null, earnedOn: dayOf(row?.earned_at ?? null), givenOn: dayOf(row?.given_at ?? null) };
  });
}

async function one(db: Db, householdId: string, milestone: number) {
  return (await streakRewardsOf(db, householdId)).find((r) => r.milestone === milestone)!;
}

/** Sets or renames the reward; one that has been given cannot change. */
export async function setStreakReward(db: Db, householdId: string, milestone: number, name: string): Promise<StreakReward> {
  const changed = await run(
    db,
    `INSERT INTO streak_reward (household_id, milestone, name) VALUES ($1, $2, $3)
       ON CONFLICT (household_id, milestone) DO UPDATE SET name = EXCLUDED.name WHERE streak_reward.given_at IS NULL`,
    [householdId, milestone, name],
  );
  if (changed === 0) throw new Problem(409, 'already-given');
  return one(db, householdId, milestone);
}

export async function clearStreakReward(db: Db, householdId: string, milestone: number): Promise<void> {
  const removed = await run(db, 'DELETE FROM streak_reward WHERE household_id = $1 AND milestone = $2 AND given_at IS NULL', [householdId, milestone]);
  if (removed > 0) return;
  const row = await get(db, 'SELECT 1 FROM streak_reward WHERE household_id = $1 AND milestone = $2', [householdId, milestone]);
  throw row ? new Problem(409, 'already-given') : new Problem(404, 'not-found');
}

/** Gives an earned reward once. */
export async function giveStreakReward(db: Db, householdId: string, milestone: number): Promise<StreakReward> {
  await earn(db, householdId, new Date());
  const changed = await run(
    db,
    'UPDATE streak_reward SET given_at = $1 WHERE household_id = $2 AND milestone = $3 AND earned_at IS NOT NULL AND given_at IS NULL',
    [new Date().toISOString(), householdId, milestone],
  );
  if (changed === 0) {
    const row = await get<Row>(db, 'SELECT milestone, name, earned_at, given_at FROM streak_reward WHERE household_id = $1 AND milestone = $2', [householdId, milestone]);
    if (!row) throw new Problem(404, 'not-found');
    throw row.given_at ? new Problem(409, 'already-given') : new Problem(400, 'not-earned');
  }
  return one(db, householdId, milestone);
}

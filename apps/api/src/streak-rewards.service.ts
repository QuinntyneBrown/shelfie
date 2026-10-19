import { all, get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { streakFor, todayIn } from './streak.ts';

/** The streak lengths a parent can set a reward for. */
export const MILESTONES = [7, 30, 100];

export interface StreakReward {
  milestone: number;
  name: string | null;
  /** Whole dollars, or null for a reward that isn't money (L2-112). */
  amount: number | null;
  /** The household day the reader first earned the reward; null until then. */
  earnedOn: string | null;
  givenOn: string | null;
}

interface Row {
  milestone: number;
  name: string;
  amount: number | null;
  earned_at: string | null;
  given_at: string | null;
}

/**
 * Marks every set reward whose milestone the reader's streak has reached as earned by her; one she already earned
 * stays as it was (ADR-0012). Rewards are set per household and earned per reader (ADR-0018).
 */
async function earn(db: Db, householdId: string, readerId: string | null, now: Date) {
  if (!readerId) return;
  await run(
    db,
    `INSERT INTO streak_reward_earned (household_id, milestone, reader_id, earned_at)
       SELECT household_id, milestone, $2, $3 FROM streak_reward WHERE household_id = $1 AND milestone <= $4
       ON CONFLICT (reader_id, milestone) DO NOTHING`,
    [householdId, readerId, now.toISOString(), await streakFor(db, householdId, now, readerId)],
  );
}

/** The three milestones with what the parent set for each and where the reader stands with it, earning first. */
export async function streakRewardsOf(db: Db, householdId: string, readerId: string | null, now = new Date()): Promise<StreakReward[]> {
  await earn(db, householdId, readerId, now);
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  const rows = await all<Row>(
    db,
    `SELECT r.milestone, r.name, r.amount, e.earned_at, e.given_at
       FROM streak_reward r LEFT JOIN streak_reward_earned e ON e.household_id = r.household_id AND e.milestone = r.milestone AND e.reader_id = $2
      WHERE r.household_id = $1`,
    [householdId, readerId],
  );
  const dayOf = (iso: string | null) => (iso ? todayIn(time_zone, new Date(iso)) : null);
  return MILESTONES.map((milestone) => {
    const row = rows.find((r) => r.milestone === milestone);
    return { milestone, name: row?.name ?? null, amount: row?.amount ?? null, earnedOn: dayOf(row?.earned_at ?? null), givenOn: dayOf(row?.given_at ?? null) };
  });
}

/** True once the reward has been given to any reader; it can then no longer change. */
async function givenToAnyone(db: Db, householdId: string, milestone: number) {
  return !!(await get(db, 'SELECT 1 FROM streak_reward_earned WHERE household_id = $1 AND milestone = $2 AND given_at IS NOT NULL', [householdId, milestone]));
}

/** Sets or changes the reward's name and amount; one that has been given to a reader cannot change. */
export async function setStreakReward(db: Db, householdId: string, milestone: number, name: string, amount: number | null, readerId: string | null): Promise<StreakReward> {
  if (await givenToAnyone(db, householdId, milestone)) throw new Problem(409, 'already-given');
  await run(
    db,
    `INSERT INTO streak_reward (household_id, milestone, name, amount) VALUES ($1, $2, $3, $4)
       ON CONFLICT (household_id, milestone) DO UPDATE SET name = EXCLUDED.name, amount = EXCLUDED.amount`,
    [householdId, milestone, name, amount],
  );
  return (await streakRewardsOf(db, householdId, readerId)).find((r) => r.milestone === milestone)!;
}

export async function clearStreakReward(db: Db, householdId: string, milestone: number): Promise<void> {
  if (await givenToAnyone(db, householdId, milestone)) throw new Problem(409, 'already-given');
  const removed = await run(db, 'DELETE FROM streak_reward WHERE household_id = $1 AND milestone = $2', [householdId, milestone]);
  if (removed === 0) throw new Problem(404, 'not-found');
}

/** Gives a reader's earned reward once. */
export async function giveStreakReward(db: Db, householdId: string, milestone: number, readerId: string | null): Promise<StreakReward> {
  if (!(await get(db, 'SELECT 1 FROM streak_reward WHERE household_id = $1 AND milestone = $2', [householdId, milestone]))) throw new Problem(404, 'not-found');
  await earn(db, householdId, readerId, new Date());
  const changed = await run(
    db,
    'UPDATE streak_reward_earned SET given_at = $1 WHERE household_id = $2 AND milestone = $3 AND reader_id = $4 AND given_at IS NULL',
    [new Date().toISOString(), householdId, milestone, readerId],
  );
  if (changed === 0) {
    const row = await get<{ given_at: string | null }>(db, 'SELECT given_at FROM streak_reward_earned WHERE reader_id = $1 AND milestone = $2', [readerId, milestone]);
    throw row ? new Problem(409, 'already-given') : new Problem(400, 'not-earned');
  }
  return (await streakRewardsOf(db, householdId, readerId)).find((r) => r.milestone === milestone)!;
}

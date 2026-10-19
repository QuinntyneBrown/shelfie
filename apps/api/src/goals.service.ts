import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { all, get, run, type Db } from './db.ts';
import { Problem } from './problem.ts';
import { todayIn } from './streak.ts';

/** A reading goal and where it stands (L2-157). */
export interface GoalView {
  target: number;
  startsOn: string;
  endsOn: string;
  finished: number;
  state: 'in-progress' | 'reached' | 'ended';
}

export interface GoalInput {
  target: number;
  endsOn: string;
}

const MAX_DAYS_AHEAD = 366;

/** Target 1 to `max` books; an end date from today to a year ahead, checked against the household's today (L2-154, L2-159). */
export const goalSchema = (max: number) =>
  z.object({
    target: z.number().int().min(1).max(max),
    endsOn: z.iso.date(),
  });

interface GoalRow {
  id: string;
  target: number;
  starts_on: string;
  ends_on: string;
}

const dayAfter = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export async function householdToday(db: Db, householdId: string) {
  const { time_zone } = (await get<{ time_zone: string }>(db, 'SELECT time_zone FROM household WHERE id = $1', [householdId]))!;
  return todayIn(time_zone, new Date());
}

/**
 * Books finished per household from `startsOn` to `endsOn` inclusive, each by the day it was finished in its own
 * household's time zone, by any of its readers (ADR-0021, L2-155).
 */
export async function finishedBetween(db: Db, householdIds: string[], startsOn: string, endsOn: string): Promise<Map<string, number>> {
  const rows = await all<{ household_id: string; finished: number }>(
    db,
    `SELECT b.household_id, COUNT(*) AS finished FROM book b JOIN household h ON h.id = b.household_id
      WHERE b.household_id = ANY($1) AND b.finished_at IS NOT NULL
        AND to_char(b.finished_at::timestamptz AT TIME ZONE h.time_zone, 'YYYY-MM-DD') BETWEEN $2 AND $3
      GROUP BY b.household_id`,
    [householdIds, startsOn, endsOn],
  );
  return new Map(rows.map((r) => [r.household_id, r.finished]));
}

function toView(goal: GoalRow, finished: number, today: string): GoalView {
  const state = finished >= goal.target ? 'reached' : today > goal.ends_on ? 'ended' : 'in-progress';
  return { target: goal.target, startsOn: goal.starts_on, endsOn: goal.ends_on, finished, state };
}

function checkEndDate(input: GoalInput, today: string) {
  if (input.endsOn < today || input.endsOn > dayAfter(today, MAX_DAYS_AHEAD)) {
    throw new Problem(400, 'validation', { errors: [{ field: 'endsOn', message: 'Pick today or a later day, within a year.' }] });
  }
}

/** The household's goal as seen by one of its people, or null. */
export async function householdGoal(db: Db, householdId: string): Promise<GoalView | null> {
  const goal = await get<GoalRow>(db, 'SELECT id, target, starts_on, ends_on FROM reading_goal WHERE household_id = $1', [householdId]);
  if (!goal) return null;
  const counts = await finishedBetween(db, [householdId], goal.starts_on, goal.ends_on);
  return toView(goal, counts.get(householdId) ?? 0, await householdToday(db, householdId));
}

/** Sets the household's goal; an existing one keeps its first day and takes the new target and end date (L2-156). */
export async function setHouseholdGoal(db: Db, householdId: string, input: GoalInput): Promise<GoalView> {
  const today = await householdToday(db, householdId);
  checkEndDate(input, today);
  await run(
    db,
    `INSERT INTO reading_goal (id, household_id, target, starts_on, ends_on, created_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (household_id) WHERE household_id IS NOT NULL DO UPDATE SET target = EXCLUDED.target, ends_on = EXCLUDED.ends_on`,
    [randomUUID(), householdId, input.target, today, input.endsOn, new Date().toISOString()],
  );
  return (await householdGoal(db, householdId))!;
}

export async function removeHouseholdGoal(db: Db, householdId: string) {
  if ((await run(db, 'DELETE FROM reading_goal WHERE household_id = $1', [householdId])) === 0) throw new Problem(404, 'not-found');
}

/** A community's goal with each member household's own count, as seen from `viewerHouseholdId`'s calendar day. */
export async function communityGoal(db: Db, communityId: string, viewerHouseholdId: string): Promise<{ goal: GoalView; counts: Map<string, number> } | null> {
  const goal = await get<GoalRow>(db, 'SELECT id, target, starts_on, ends_on FROM reading_goal WHERE community_id = $1', [communityId]);
  if (!goal) return null;
  const members = await all<{ household_id: string }>(db, 'SELECT household_id FROM community_member WHERE community_id = $1', [communityId]);
  const counts = await finishedBetween(db, members.map((m) => m.household_id), goal.starts_on, goal.ends_on);
  const finished = [...counts.values()].reduce((sum, n) => sum + n, 0);
  return { goal: toView(goal, finished, await householdToday(db, viewerHouseholdId)), counts };
}

export async function setCommunityGoal(db: Db, communityId: string, householdId: string, input: GoalInput) {
  const today = await householdToday(db, householdId);
  checkEndDate(input, today);
  await run(
    db,
    `INSERT INTO reading_goal (id, community_id, target, starts_on, ends_on, created_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (community_id) WHERE community_id IS NOT NULL DO UPDATE SET target = EXCLUDED.target, ends_on = EXCLUDED.ends_on`,
    [randomUUID(), communityId, input.target, today, input.endsOn, new Date().toISOString()],
  );
}

export async function removeCommunityGoal(db: Db, communityId: string) {
  if ((await run(db, 'DELETE FROM reading_goal WHERE community_id = $1', [communityId])) === 0) throw new Problem(404, 'not-found');
}

/** Every goal a household's people see: its own and those of its communities that have one (L2-158, L2-160). */
export async function goalsOf(db: Db, householdId: string) {
  const communities = await all<{ id: string; name: string }>(
    db,
    `SELECT c.id, c.name FROM community c JOIN community_member m ON m.community_id = c.id JOIN reading_goal g ON g.community_id = c.id
      WHERE m.household_id = $1 ORDER BY m.joined_at, c.id`,
    [householdId],
  );
  return {
    household: await householdGoal(db, householdId),
    communities: await Promise.all(communities.map(async (c) => ({ id: c.id, name: c.name, goal: (await communityGoal(db, c.id, householdId))!.goal }))),
  };
}

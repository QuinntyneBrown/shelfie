import { randomInt, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { all, get, run, transaction, type Db } from './db.ts';
import { communityGoal, type GoalView } from './goals.service.ts';
import { Problem } from './problem.ts';

/** No 0, O, 1, I or L, so a code read aloud or copied by hand is never mistaken (ADR-0020). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const UNIQUE_VIOLATION = '23505';

export const newJoinCode = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

/** What a parent typed, as stored: capitals, no spaces or dashes. */
export const normaliseCode = (typed: string) => typed.toUpperCase().replace(/[\s-]/g, '');

/** A member household as the other members see it: its display name, whether it is the viewer's, and its count (L2-153). */
export interface Family {
  name: string;
  you: boolean;
  /** Books toward the community's reading goal; null while it has none. */
  finished: number | null;
}

export interface CommunityView {
  id: string;
  name: string;
  joinCode: string;
  /** Whether the viewer's household manages it: the member that joined first (ADR-0020). */
  manages: boolean;
  families: Family[];
  goal: GoalView | null;
}

export interface CommunitySummary {
  id: string;
  name: string;
  families: number;
  goal: GoalView | null;
}

interface MemberRow {
  household_id: string;
  display_name: string;
}

/** The members, the managing one first; it is the household that joined first. */
const members = (db: Db, communityId: string) =>
  all<MemberRow>(db, 'SELECT household_id, display_name FROM community_member WHERE community_id = $1 ORDER BY joined_at, household_id', [communityId]);

/** The community if the household is a member; any other community, existing or not, is 404 (L2-153). */
export async function membership(db: Db, communityId: string, householdId: string) {
  const community = await get<{ id: string; name: string; join_code: string }>(
    db,
    `SELECT c.id, c.name, c.join_code FROM community c JOIN community_member m ON m.community_id = c.id
      WHERE c.id = $1 AND m.household_id = $2`,
    [communityId, householdId],
  );
  if (!community) throw new Problem(404, 'not-found');
  return community;
}

/** True when the household manages the community: it joined first. */
export async function manages(db: Db, communityId: string, householdId: string) {
  return (await members(db, communityId))[0]?.household_id === householdId;
}

export async function getCommunity(db: Db, communityId: string, householdId: string): Promise<CommunityView> {
  const community = await membership(db, communityId, householdId);
  const rows = await members(db, communityId);
  const goal = await communityGoal(db, communityId, householdId);
  return {
    id: community.id,
    name: community.name,
    joinCode: community.join_code,
    manages: rows[0]?.household_id === householdId,
    families: rows.map((r) => ({ name: r.display_name, you: r.household_id === householdId, finished: goal ? (goal.counts.get(r.household_id) ?? 0) : null })),
    goal: goal?.goal ?? null,
  };
}

export async function listCommunities(db: Db, householdId: string): Promise<CommunitySummary[]> {
  const rows = await all<Omit<CommunitySummary, 'goal'>>(
    db,
    `SELECT c.id, c.name, (SELECT COUNT(*) FROM community_member a WHERE a.community_id = c.id) AS families
       FROM community c JOIN community_member m ON m.community_id = c.id WHERE m.household_id = $1 ORDER BY m.joined_at, c.id`,
    [householdId],
  );
  return Promise.all(rows.map(async (row) => ({ ...row, goal: (await communityGoal(db, row.id, householdId))?.goal ?? null })));
}

/** Only the managing household changes the community's goal (ADR-0020); a non-member gets 404 first. */
export async function requireManager(db: Db, communityId: string, householdId: string) {
  await membership(db, communityId, householdId);
  if (!(await manages(db, communityId, householdId))) throw new Problem(403, 'owner-only');
}

/** Starts a community with a fresh code and the household as its first, managing, member. */
export async function startCommunity(pool: Pool, householdId: string, name: string, familyName: string): Promise<CommunityView> {
  const id = randomUUID();
  for (;;) {
    try {
      await transaction(pool, async (db) => {
        const now = new Date().toISOString();
        await run(db, 'INSERT INTO community (id, name, join_code, created_at) VALUES ($1, $2, $3, $4)', [id, name, newJoinCode(), now]);
        await run(db, 'INSERT INTO community_member (community_id, household_id, display_name, joined_at) VALUES ($1, $2, $3, $4)', [id, householdId, familyName, now]);
      });
      return getCommunity(pool, id, householdId);
    } catch (e) {
      if ((e as { code?: string }).code !== UNIQUE_VIOLATION) throw e;
    }
  }
}

export async function joinCommunity(db: Db, householdId: string, code: string, familyName: string): Promise<CommunityView> {
  const community = await get<{ id: string }>(db, 'SELECT id FROM community WHERE join_code = $1', [normaliseCode(code)]);
  if (!community) throw new Problem(404, 'code-not-found');
  const added = await run(
    db,
    'INSERT INTO community_member (community_id, household_id, display_name, joined_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    [community.id, householdId, familyName, new Date().toISOString()],
  );
  if (added === 0) throw new Problem(409, 'already-member');
  return getCommunity(db, community.id, householdId);
}

/** The household leaves; the next to have joined manages it from then on, and the last to leave deletes it (L2-151). */
export async function leaveCommunity(pool: Pool, communityId: string, householdId: string) {
  await transaction(pool, async (db) => {
    const left = await run(db, 'DELETE FROM community_member WHERE community_id = $1 AND household_id = $2', [communityId, householdId]);
    if (left === 0) throw new Problem(404, 'not-found');
    await run(db, 'DELETE FROM community c WHERE c.id = $1 AND NOT EXISTS (SELECT 1 FROM community_member m WHERE m.community_id = c.id)', [communityId]);
  });
}

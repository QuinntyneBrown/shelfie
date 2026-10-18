import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { all, get, run, transaction, type Db } from './db.ts';
import { Problem } from './problem.ts';

export interface RewardPicture {
  id: string;
  url: string;
}

export interface GalleryReward {
  id: string;
  name: string;
  target: number;
  /** Empty when the parent wrote none. */
  description: string;
  /** Oldest first. */
  pictures: RewardPicture[];
  /** The URL of the featured picture; null without pictures. */
  featuredPicture: string | null;
}

export interface GalleryRewardInput {
  name: string;
  description: string;
  target: number;
}

type RewardRow = Pick<GalleryReward, 'id' | 'name' | 'target' | 'description'>;

export interface Goal {
  rewardId: string;
  name: string;
  target: number;
  finished: number;
  reached: boolean;
  /** The finished book that reached the target, once it is reached. */
  bookId: string | null;
}

export interface GalleryView {
  rewards: GalleryReward[];
  goal: Goal | null;
}

/** The URL every reward picture loads; the version changes with each new picture. */
export function rewardPictureUrl(rewardId: string, pictureId: string, etag: string) {
  return `/api/gallery-rewards/${rewardId}/pictures/${pictureId}?v=${etag}`;
}

/** The rewards with their pictures; the image bytes are never read here. */
async function withPictures(db: Db, rows: RewardRow[]): Promise<GalleryReward[]> {
  const pictures = await all<{ id: string; reward_id: string; etag: string; featured: boolean }>(
    db,
    'SELECT id, reward_id, etag, featured FROM reward_picture WHERE reward_id = ANY($1) ORDER BY created_at, id',
    [rows.map((r) => r.id)],
  );
  return rows.map((row) => {
    const own = pictures.filter((p) => p.reward_id === row.id).map((p) => ({ ...p, url: rewardPictureUrl(row.id, p.id, p.etag) }));
    return { ...row, pictures: own.map(({ id, url }) => ({ id, url })), featuredPicture: own.find((p) => p.featured)?.url ?? null };
  });
}

export async function getGallery(db: Db, householdId: string): Promise<GalleryView> {
  const rows = await all<RewardRow>(db, 'SELECT id, name, target, description FROM gallery_reward WHERE household_id = $1 ORDER BY created_at, id', [householdId]);
  return { rewards: await withPictures(db, rows), goal: await goalOf(db, householdId) };
}

/**
 * The reward the household is reading toward and its progress: the books finished since it was picked
 * (ADR-0009). The book that brings the count to the target reaches it; once that book has a reward the
 * goal is complete and there is none.
 */
export async function goalOf(db: Db, householdId: string): Promise<Goal | null> {
  const picked = await get<RewardRow & { picked_at: string }>(
    db,
    'SELECT id, name, target, picked_at FROM gallery_reward WHERE household_id = $1 AND picked_at IS NOT NULL',
    [householdId],
  );
  if (!picked) return null;
  const books = await all<{ id: string; rewarded: boolean }>(
    db,
    `SELECT b.id, r.book_id IS NOT NULL AS rewarded FROM book b LEFT JOIN reward r ON r.book_id = b.id
      WHERE b.household_id = $1 AND b.finished_at >= $2 ORDER BY b.finished_at, b.id`,
    [householdId, picked.picked_at],
  );
  const goalBook = books[picked.target - 1];
  if (goalBook?.rewarded) return null;
  return {
    rewardId: picked.id,
    name: picked.name,
    target: picked.target,
    finished: Math.min(books.length, picked.target),
    reached: !!goalBook,
    bookId: goalBook?.id ?? null,
  };
}

export async function addGalleryReward(db: Db, householdId: string, input: GalleryRewardInput): Promise<GalleryReward> {
  const reward = { id: randomUUID(), name: input.name, target: input.target, description: input.description, pictures: [], featuredPicture: null };
  await db.query('INSERT INTO gallery_reward (id, household_id, name, target, description, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [
    reward.id,
    householdId,
    reward.name,
    reward.target,
    reward.description,
    new Date().toISOString(),
  ]);
  return reward;
}

export async function updateGalleryReward(db: Db, householdId: string, id: string, input: GalleryRewardInput): Promise<GalleryReward> {
  const reward = await get<RewardRow>(
    db,
    'UPDATE gallery_reward SET name = $1, target = $2, description = $3 WHERE id = $4 AND household_id = $5 RETURNING id, name, target, description',
    [input.name, input.target, input.description, id, householdId],
  );
  if (!reward) throw new Problem(404, 'not-found');
  return (await withPictures(db, [reward]))[0]!;
}

/** Removing the goal removes it with its row; rewards already given stay on their books. */
export async function removeGalleryReward(db: Db, householdId: string, id: string): Promise<void> {
  if (!(await run(db, 'DELETE FROM gallery_reward WHERE id = $1 AND household_id = $2', [id, householdId]))) throw new Problem(404, 'not-found');
}

/** Makes a reward the household's goal, counting from now; any earlier goal stops being one. */
export async function pickGoal(pool: Pool, householdId: string, id: string): Promise<GalleryView> {
  await transaction(pool, async (db) => {
    if (!(await get(db, 'SELECT id FROM gallery_reward WHERE id = $1 AND household_id = $2', [id, householdId]))) throw new Problem(404, 'not-found');
    await run(db, 'UPDATE gallery_reward SET picked_at = NULL WHERE household_id = $1', [householdId]);
    await run(db, 'UPDATE gallery_reward SET picked_at = $1 WHERE id = $2', [new Date().toISOString(), id]);
  });
  return getGallery(pool, householdId);
}

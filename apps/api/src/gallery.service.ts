import { randomUUID } from 'node:crypto';
import { all, type Db } from './db.ts';

export interface GalleryReward {
  id: string;
  name: string;
  target: number;
}

export interface GalleryRewardInput {
  name: string;
  target: number;
}

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

export async function getGallery(db: Db, householdId: string): Promise<GalleryView> {
  const rewards = await all<GalleryReward>(db, 'SELECT id, name, target FROM gallery_reward WHERE household_id = $1 ORDER BY created_at, id', [householdId]);
  return { rewards, goal: null };
}

export async function addGalleryReward(db: Db, householdId: string, input: GalleryRewardInput): Promise<GalleryReward> {
  const reward = { id: randomUUID(), name: input.name, target: input.target };
  await db.query('INSERT INTO gallery_reward (id, household_id, name, target, created_at) VALUES ($1, $2, $3, $4, $5)', [
    reward.id,
    householdId,
    reward.name,
    reward.target,
    new Date().toISOString(),
  ]);
  return reward;
}

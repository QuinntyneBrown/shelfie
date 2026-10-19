import { randomUUID } from 'node:crypto';
import { run, type Db } from './db.ts';

export interface Feedback {
  kind: 'feel' | 'idea';
  score: number | null;
  message: string | null;
}

/** Saves feedback against the sender's own household and profile, never ones from the request (L2-119). */
export async function sendFeedback(db: Db, householdId: string, profileId: string, feedback: Feedback) {
  const id = randomUUID();
  await run(db, 'INSERT INTO feedback (id, household_id, profile_id, kind, score, message, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [
    id,
    householdId,
    profileId,
    feedback.kind,
    feedback.score,
    feedback.message,
    new Date().toISOString(),
  ]);
  return { id };
}

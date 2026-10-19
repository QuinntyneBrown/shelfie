import { randomUUID } from 'node:crypto';
import { run, type Db } from './db.ts';

export interface Subscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Stores a browser's subscription against the signed-in profile; the same browser signing in again takes it over (L2-127). */
export async function saveSubscription(db: Db, profileId: string, { endpoint, keys }: Subscription) {
  await run(
    db,
    `INSERT INTO push_subscription (id, profile_id, endpoint, p256dh, auth, created_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (endpoint) DO UPDATE SET profile_id = EXCLUDED.profile_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [randomUUID(), profileId, endpoint, keys.p256dh, keys.auth, new Date().toISOString()],
  );
}

/** Removes the profile's own subscription for an endpoint; another profile's, or an unknown one, is left alone (L2-127). */
export async function removeSubscription(db: Db, profileId: string, endpoint: string) {
  await run(db, 'DELETE FROM push_subscription WHERE endpoint = $1 AND profile_id = $2', [endpoint, profileId]);
}

import { fileURLToPath } from 'node:url';
import { openDb, run, type Db } from './db.ts';

/** Sign-in attempts older than the rate-limit window serve no purpose. */
const ATTEMPT_WINDOW_MINUTES = 10;

/** Deletes expired sessions, spent or expired reset tokens and old sign-in attempts. Runs nightly from backup.sh. */
export async function purgeExpired(db: Db, now = new Date()) {
  const at = now.toISOString();
  return {
    sessions: await run(db, 'DELETE FROM session WHERE expires_at < $1', [at]),
    resets: await run(db, 'DELETE FROM password_reset WHERE used_at IS NOT NULL OR expires_at < $1', [at]),
    attempts: await run(db, 'DELETE FROM sign_in_attempt WHERE at < $1', [new Date(now.getTime() - ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString()]),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = openDb(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/shelfie');
  const purged = await purgeExpired(db);
  await db.end();
  console.log(`purged ${purged.sessions} sessions, ${purged.resets} reset tokens, ${purged.attempts} sign-in attempts`);
}

import { createApp } from './app.ts';
import { migrate, openDb } from './db.ts';
import { stdoutLog } from './logging.ts';

const url = process.env.DATABASE_URL;
if (!url) {
  stdoutLog({ level: 'error', time: new Date().toISOString(), error: 'DATABASE_URL is not set' });
  process.exit(1);
}
const db = openDb(url);
try {
  await migrate(db);
} catch (e) {
  // The message names the host, database or migration, never the connection string itself.
  stdoutLog({ level: 'error', time: new Date().toISOString(), error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
}
const port = Number(process.env.PORT ?? 3000);
createApp(db).listen(port, () => console.log(`api listening on ${port}`));

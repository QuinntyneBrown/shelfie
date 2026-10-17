import { createApp } from './app.ts';
import { openDb } from './db.ts';

const db = openDb(process.env.SHELFIE_DB ?? 'shelfie.db');
const port = Number(process.env.PORT ?? 3000);
createApp(db).listen(port, () => console.log(`api listening on ${port}`));

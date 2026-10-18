import { migrate, openDb } from './db.ts';
import { seed } from './seed.ts';

const db = openDb(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/shelfie');
await migrate(db);
await seed(db, { books: !process.argv.includes('--no-books') });
await db.end();
console.log('seeded');

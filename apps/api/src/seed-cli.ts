import { openDb } from './db.ts';
import { seed } from './seed.ts';

seed(openDb(process.env.SHELFIE_DB ?? 'shelfie.db'), { books: !process.argv.includes('--no-books') });
console.log('seeded');

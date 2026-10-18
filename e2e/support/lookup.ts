import { readFileSync } from 'node:fs';
import type { Provider } from '../../apps/api/src/book-search.service.ts';
import { coverFixture } from './covers';

/**
 * Stands in for Open Library and the AI helper behind each worker's API. What the typed title contains
 * decides the answer, so a test picks its behaviour by what it types and needs no setup of its own.
 */
interface Entry {
  title: string;
  author: string | null;
  coverId: string | null;
}

/** Cover ids the fake cover host serves; every other id is missing. */
export const COVER_IDS = { winnDixie: '8739161', hobbit: '1937', missing: '404404' };

const CATALOGUE: Entry[] = [
  { title: 'Because of Winn-Dixie', author: 'Kate DiCamillo', coverId: COVER_IDS.winnDixie },
  { title: 'Because of Winn-Dixie: Read-Along Edition', author: 'Kate DiCamillo', coverId: null },
  { title: 'Winnie-the-Pooh', author: 'A. A. Milne', coverId: COVER_IDS.missing },
  { title: 'The Hobbit', author: 'J. R. R. Tolkien', coverId: COVER_IDS.hobbit },
  { title: 'Winter Holiday', author: 'Arthur Ransome', coverId: null },
  { title: 'The Winter Fox', author: null, coverId: null },
  { title: 'Wintering Owl', author: 'Ada Lark', coverId: null },
  { title: 'Winter Sleep', author: 'Ada Lark', coverId: null },
  { title: 'A Wintry Tale', author: 'Ada Lark', coverId: null },
  { title: 'Winterhouse', author: 'Ben Guterson', coverId: null },
  { title: 'Slow Boat to China', author: 'Ada Lark', coverId: null },
  { title: '<b>Bold</b> Title', author: '<i>Emphatic</i> Author', coverId: null },
];

const SUGGESTIONS = [
  { title: 'Dragon Rider', author: 'Cornelia Funke', chapterCount: 56 },
  { title: 'Dragon Rider: The Griffin’s Feather', author: 'Cornelia Funke', chapterCount: 40 },
  { title: 'The Dragon Rider’s Handbook', author: null, chapterCount: 12 },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The catalogue: titles containing the typed text; "fail…" breaks, "slow…" takes 1.5 s. */
export const fakeCatalogue: Provider = async (title) => {
  const q = title.toLowerCase();
  if (q.startsWith('fail')) throw new Error('catalogue down');
  if (q.startsWith('slow')) await delay(1500);
  return CATALOGUE.filter((entry) => entry.title.toLowerCase().includes(q)).map((entry) => ({ ...entry, chapterCount: null }));
};

/** The AI helper: guesses for "dragon…", nothing for anything else, and broken for "fail…". */
export const fakeAi: Provider = async (title) => {
  const q = title.toLowerCase();
  if (q.startsWith('fail')) throw new Error('ai down');
  return q.includes('dragon') ? SUGGESTIONS : [];
};

/** The cover host: the fixture picture for the known ids, 404 for the rest. */
export const fakeCoverFetch = (async (url: string | URL) => {
  const id = String(url).match(/\/b\/id\/(\d+)-L\.jpg$/)?.[1];
  if (id !== COVER_IDS.winnDixie && id !== COVER_IDS.hobbit) return new Response('gone', { status: 404 });
  return new Response(new Uint8Array(readFileSync(coverFixture())), { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
}) as typeof fetch;

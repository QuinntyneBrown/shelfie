import type { Provider } from './book-search.service.ts';
import { processCover } from './covers.service.ts';
import { Problem } from './problem.ts';

const SEARCH_URL = 'https://openlibrary.org/search.json';

/**
 * The Open Library catalogue. The request carries the typed title and nothing else. Each result becomes a
 * match with its first author and its cover id; Open Library states no chapter count, and its page count
 * is not turned into one, so `chapterCount` is always null here.
 */
export const openLibrary =
  (fetchFn: typeof fetch = fetch): Provider =>
  async (title, signal) => {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('title', title);
    url.searchParams.set('fields', 'title,author_name,cover_i');
    url.searchParams.set('limit', '5');
    const response = await fetchFn(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Open Library answered ${response.status}`);
    const { docs } = (await response.json()) as { docs?: { title?: unknown; author_name?: unknown; cover_i?: unknown }[] };
    return (docs ?? []).map((doc) => ({
      title: doc.title,
      author: Array.isArray(doc.author_name) ? (doc.author_name[0] ?? null) : null,
      chapterCount: null,
      coverId: doc.cover_i == null ? null : String(doc.cover_i),
    }));
  };

const COVER_HOST = 'https://covers.openlibrary.org/b/id/';
const COVER_ID = /^\d{1,12}$/;
const COVER_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Fetches a catalogue cover from Open Library's cover host and puts it through the cover rules. The host and
 * path are fixed here and the id is digits only, so no caller can point the fetch anywhere else. A missing or
 * unreachable cover is `not-found`; bytes over 5 MB or that are not an accepted image are `photo-type`.
 */
export async function fetchCatalogueCover(coverId: string, signal: AbortSignal, fetchFn: typeof fetch = fetch): Promise<Buffer> {
  if (!COVER_ID.test(coverId)) throw new Problem(400, 'validation');
  let response: Response;
  try {
    response = await fetchFn(`${COVER_HOST}${coverId}-L.jpg`, { signal, redirect: 'error' });
  } catch {
    throw new Problem(404, 'not-found');
  }
  if (!response.ok || !response.body) throw new Problem(404, 'not-found');
  if (Number(response.headers.get('content-length') ?? 0) > COVER_MAX_BYTES) throw new Problem(404, 'photo-type');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > COVER_MAX_BYTES) {
      await response.body.cancel().catch(() => {});
      throw new Problem(404, 'photo-type');
    }
    chunks.push(chunk);
  }
  try {
    return await processCover(Buffer.concat(chunks));
  } catch {
    throw new Problem(404, 'photo-type');
  }
}

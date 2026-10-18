import type { Provider } from './book-search.service.ts';

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

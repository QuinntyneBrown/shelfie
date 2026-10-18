import { z } from 'zod';
import { Problem } from './problem.ts';

/** A book the lookup offers: what the catalogue or the AI helper said, bounded to what the form accepts. */
export interface BookMatch {
  title: string;
  author: string | null;
  chapterCount: number | null;
  coverId: string | null;
  /** True for a guess from the AI helper, which the page labels as such. */
  suggested: boolean;
}

/** A source of matches: given only the typed title, answers rows that `matchSchema` then bounds. */
export type Provider = (title: string, signal: AbortSignal) => Promise<unknown>;

export interface Providers {
  catalogue: Provider;
  /** Null when no AI key is configured. */
  ai: Provider | null;
  /** Reaches the catalogue's cover host; tests pass a fake. */
  coverFetch?: typeof fetch;
}

const MAX_MATCHES = 5;

const text = (max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.slice(0, max));

/** One row from a provider, treated as untrusted data: text is trimmed and cut, bad numbers and ids become null. */
export const matchSchema = z
  .object({
    title: text(120).pipe(z.string().min(1)),
    author: text(120).nullish(),
    chapterCount: z.number().int().min(1).max(200).nullish().catch(null),
    coverId: z
      .union([z.string(), z.number().int().nonnegative()])
      .transform(String)
      .pipe(z.string().regex(/^\d{1,12}$/))
      .nullish()
      .catch(null),
  })
  .transform(
    (row): BookMatch => ({
      title: row.title,
      author: row.author || null,
      chapterCount: row.chapterCount ?? null,
      coverId: row.coverId ?? null,
      suggested: false,
    }),
  );

/** Keeps the well-formed rows of a provider's answer, at most `limit`, marked as suggested or not. */
export function boundMatches(rows: unknown, suggested: boolean, limit = MAX_MATCHES): BookMatch[] {
  if (!Array.isArray(rows)) return [];
  const matches: BookMatch[] = [];
  for (const row of rows) {
    const match = matchSchema.safeParse(row);
    if (match.success) matches.push({ ...match.data, suggested });
    if (matches.length === limit) break;
  }
  return matches;
}

const MAX_SUGGESTIONS = 3;

export interface LookupTimeouts {
  catalogueMs?: number;
  aiMs?: number;
}

/**
 * Asks the catalogue first; when it has nothing, fails or times out, asks the AI helper, whose rows come back
 * marked as suggested. Fails as `lookup-unavailable` only when the catalogue failed and no AI could answer.
 */
export async function searchBooks(providers: Providers, title: string, { catalogueMs = 5000, aiMs = 10_000 }: LookupTimeouts = {}): Promise<BookMatch[]> {
  let catalogueFailed = false;
  try {
    const matches = boundMatches(await providers.catalogue(title, AbortSignal.timeout(catalogueMs)), false);
    if (matches.length) return matches;
  } catch {
    catalogueFailed = true;
  }
  if (providers.ai) {
    try {
      return boundMatches(await providers.ai(title, AbortSignal.timeout(aiMs)), true, MAX_SUGGESTIONS).map((match) => ({ ...match, coverId: null }));
    } catch {
      // The helper is a fallback; its failure matters only when the catalogue failed too.
    }
  }
  if (catalogueFailed) throw new Problem(503, 'lookup-unavailable');
  return [];
}

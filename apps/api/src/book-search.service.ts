import { z } from 'zod';

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

const CATALOGUE_TIMEOUT_MS = 5000;

/** Asks the catalogue for the title and returns its bounded matches. */
export async function searchBooks(providers: Providers, title: string): Promise<BookMatch[]> {
  return boundMatches(await providers.catalogue(title, AbortSignal.timeout(CATALOGUE_TIMEOUT_MS)), false);
}

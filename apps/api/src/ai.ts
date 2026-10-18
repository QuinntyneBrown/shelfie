import type { Provider } from './book-search.service.ts';

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-5-5';
const SYSTEM = [
  'You help a family find a children’s book from a title typed into a reading log. The user message is the typed title and nothing else.',
  'Answer with up to 3 likely real books as JSON only, in this shape: {"matches":[{"title":"…","author":"…","chapterCount":12}]}.',
  'Use null for an author or chapterCount you are not fairly sure of. Return {"matches":[]} when nothing fits.',
].join(' ');

/**
 * The AI helper, asked only when the catalogue has nothing: Claude is sent the typed title and asked for up
 * to three likely matches as JSON. The reply is data to be bounded by the caller, never trusted as it is.
 */
export const claude =
  (fetchFn: typeof fetch = fetch, apiKey: string): Provider =>
  async (title, signal) => {
    const response = await fetchFn(MESSAGES_URL, {
      method: 'POST',
      signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        output_config: { effort: 'low' },
        system: SYSTEM,
        messages: [{ role: 'user', content: title }],
      }),
    });
    if (!response.ok) throw new Error(`Claude answered ${response.status}`);
    const { content } = (await response.json()) as { content?: { type?: string; text?: string }[] };
    const text = (content ?? []).find((block) => block.type === 'text')?.text ?? '';
    // The model is asked for JSON only, but a fenced or prefaced object is read too.
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const { matches } = JSON.parse(json) as { matches?: unknown };
    return matches;
  };

/** The AI provider when `ANTHROPIC_API_KEY` is set; otherwise null, and the lookup runs on the catalogue alone. */
export function configuredAi(env: Record<string, string | undefined> = process.env): Provider | null {
  return env['ANTHROPIC_API_KEY'] ? claude(fetch, env['ANTHROPIC_API_KEY']) : null;
}

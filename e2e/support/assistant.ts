import { Problem } from '../../apps/api/src/problem.ts';
import type { AssistInput } from '../../apps/api/src/review-assistant.ts';

let mode: 'works' | 'fails' | 'not-set-up' = 'works';
let held: Promise<void> | null = null;

/**
 * Stands in for Claude on the API: flags answers of fewer than six words and drafts a note naming the chapter.
 * Tests switch it to fail, to be not set up, or to wait until released.
 */
export async function fakeAssistant(input: AssistInput) {
  if (held) await held;
  if (mode === 'fails') throw new Error('The assistant is down');
  if (mode === 'not-set-up') throw new Problem(503, 'assistant-unavailable');
  return {
    answers: input.answers.map(({ position, answer }) =>
      answer.trim().split(/\s+/).length < 6
        ? { position, verdict: 'weak', reason: 'Only a few words. Ask what else happened.' }
        : { position, verdict: 'ok', reason: 'Says what happened.' },
    ),
    draft: `Thank you for telling me about Chapter ${input.chapterNumber}! What was your favourite part?`,
  };
}

export function resetAssistant() {
  mode = 'works';
  held = null;
}

export function assistantFails() {
  mode = 'fails';
}

export function assistantWorks() {
  mode = 'works';
}

export function assistantNotSetUp() {
  mode = 'not-set-up';
}

/** Makes the assistant wait until the returned function is called. */
export function holdAssistant(): () => void {
  let release!: () => void;
  held = new Promise((resolve) => (release = resolve));
  return () => {
    held = null;
    release();
  };
}

import { Problem } from './problem.ts';

/** Everything the assistant is told about a chapter: never names, the household, other chapters or pictures. */
export interface AssistInput {
  bookTitle: string;
  chapterNumber: number;
  answers: { position: number; question: string; answer: string }[];
}

/** Asks an AI model about one chapter and returns its raw, unchecked answer. Tests swap in a fake. */
export type ReviewAssistant = (input: AssistInput) => Promise<unknown>;

export const anthropicAssistant: ReviewAssistant = async () => {
  throw new Problem(503, 'assistant-unavailable');
};

export async function askAssistant(assistant: ReviewAssistant, input: AssistInput) {
  return assistant(input);
}

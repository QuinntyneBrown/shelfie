import type { SuggestionInput } from '../../apps/api/src/suggestions.ts';

/** What the fake AI suggests unless a test says otherwise. */
export const IDEAS = [
  'Why do you think Aslan’s name made the children feel the way they did?',
  'How did Edmund feel when he arrived at the Witch’s house?',
  'If you were Lucy, what would you say to Edmund now?',
  'What clue shows that winter in Narnia is ending?',
  'Which part of this chapter would you most like to draw, and why?',
];

let next: () => Promise<string[]>;

/** Stands in for Claude in the worker's API: answers with the ideas a test chose. */
export function suggest(_input: SuggestionInput) {
  return next();
}

export function suggestIdeas(ideas: string[] = IDEAS) {
  next = async () => ideas;
}

/** Makes the AI fail, as an outage or a timeout would. */
export function breakSuggestions() {
  next = () => Promise.reject(new Error('The AI service is down'));
}

suggestIdeas();

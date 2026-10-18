# ADR-0007: Suggest questions with Claude from the API

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-069, L2-071, L2-072, L2-073

## Context

A parent wants help writing comprehension questions for a book (`L1-019`). Shelfie has no model of its own, so the ideas must come from a hosted large language model. That raises four choices: which provider and model, where the call is made, how the code reaches the provider, and when an idea becomes a question the reader sees.

The household's data includes a child's name, answers and photos, which must not leave Shelfie for this feature (`L2-072`). The API key must never reach the browser (`L2-073`). Tests must run without a key or a network.

## Decision

- **Provider and model:** Claude Opus 5.5 (`claude-opus-5-5`) through the Anthropic Messages API, at `low` effort with structured output (`output_config.format`, a JSON schema of `{ questions: string[] }`), and the server-side refusal fallback (`fallbacks: "default"`).
- **Where:** only the API server calls it, with the key from `ANTHROPIC_API_KEY`. Without the variable the feature reports itself as not switched on.
- **How:** one plain `fetch` inside `anthropicSuggester`, behind the `SuggestQuestions` function type. No SDK: one request and one response shape do not need it. Tests and the e2e stack pass a fake function instead.
- **When an idea becomes a question:** never on its own. Suggestions are returned to the dialog and not stored; only the ones the parent ticks, after any edits, are saved through the existing add-question route.

## Consequences

- The only data that leaves the server is the title, author, chapter number and existing questions, and only when a parent asks.
- Swapping the provider or the model means changing one function; the route, the filtering and the UI stay.
- The dialog waits for one non-streaming response, bounded at 20 seconds; the busy state covers the wait.
- Each ask costs money, so asks are rate-limited per household (5 in 10 minutes). Quotas and billing screens are deferred.
- A provider outage only disables suggestions: the add-question path does not depend on it.

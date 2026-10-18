# Estimate — Voice answers

## Basis

Hours for an intermediate Angular/TypeScript developer who has not seen this codebase. The hours cover implementation, Playwright acceptance tests through page objects, and review fixes. They exclude the requirements, mocks, design-system page and this design. `sh-question-field`, `LogChapterPage`, the log-chapter page object and the components stylesheet are assumed present. [Detailed design](../../detailed-designs/reading-log/voice-answers/README.md).

## Full design

| Work item | Hours |
|-----------|------:|
| `sh-question-field`: support check, microphone button, recogniser start/stop, interim and final words appended within `maxlength`, one active dictation, error message, live region | 4 |
| `.mic-dot` style and the microphone icon; reduced motion | 1 |
| Playwright acceptance tests with a stubbed `SpeechRecognition`, through a `LogChapterPage` page object (dictate, stop, unsupported, refused, maxlength, one at a time) | 3 |
| **Total** | **8** |

## Minimal scope

Start and stop dictation that fills the box, without the refused-microphone message, the live region or the one-at-a-time rule. It satisfies `L2-093` criteria 1 to 4 and 7. Total: 5 hours.

## Partial descoping

| Descope | What is lost | Hours saved |
|---------|--------------|------------:|
| Drop the refused-microphone message | A refusal fails silently | 1 |
| Drop the live region | Screen-reader users hear no start or stop | 1 |
| Drop the one-at-a-time rule | Two boxes can listen together | 1 |

# ADR-0010: Answers are dictated with the browser's speech recognition, not a Shelfie service

- Status: Accepted
- Date: 2026-10-18
- Requirements: L2-093, L2-094, L2-095

## Context

Item 3 of `docs/feature-enhancements.md` asks for voice answers so that typing never slows the reader down. Speech has to become text somewhere: in the browser, or in a service that Shelfie runs or calls. The reader is a child, answers are personal, and the API today never receives anything before the chapter is logged except the draft that stays on the device.

The target is bleeding-edge Chrome only (`AGENTS.md`), which ships `SpeechRecognition` (as `webkitSpeechRecognition`), and no fallbacks for other browsers are wanted.

## Decision

1. **The browser recognises the speech.** `sh-question-field` uses `SpeechRecognition` directly. Shelfie records, uploads and stores no audio, and the API gains no endpoint, no column and no setting.
2. **Dictation only fills the box.** Recognised words are added to the answer, which stays an ordinary editable text. Nothing is sent until she logs the chapter, through the unchanged request (`L2-011`), so validation, drafts and the 2000-character limit all apply as they do to typing.
3. **The button exists only where recognition does.** When the browser lacks the API the button is not drawn. There is no polyfill and no server fallback.
4. **One dictation at a time.** Starting it in another answer stops the first. Each field owns its recogniser; a small module-level reference to the active one is enough.
5. **Failure is a message, not a state to recover.** A refused or missing microphone, or any recognition error, stops listening, keeps the words so far and shows one sentence: "Shelfie can't hear you. You can type your answer instead."

## Consequences

- No new data, no migration, no API change, no cost, and nothing to add to the privacy notice beyond the fact that Chrome may process speech with its own provider; Shelfie never sees it.
- Chrome's recognition may send audio to Google. That is the browser's behaviour and is outside Shelfie. A parent who objects can turn off the microphone permission and typing works as before.
- Tests cannot use a real microphone. Playwright stubs `SpeechRecognition` before the page loads, which tests Shelfie's handling of results and errors but not Chrome's recognition quality.
- Language follows the document's `lang`. Other languages and read-aloud questions are out of scope.

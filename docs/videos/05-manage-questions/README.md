# 05 · Manage questions

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [05-manage-questions.mp4](05-manage-questions.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the parent adds his own comprehension question to a book (journey 5).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: sign in as Dad, Manage The Lion, the Witch and the Wardrobe, the three default questions, add a fourth |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:15 | Introduction | Title slide |
| 00:15-01:16 | Writing a question | Screen recording |
| 01:16-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts 05-manage-questions
node tools/video-audio/generate-audio.mjs docs/videos/05-manage-questions
node tools/video-build/build-video.mjs docs/videos/05-manage-questions
```

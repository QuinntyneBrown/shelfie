# 09 · Celebrate a finished book

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [09-celebrate-a-finished-book.mp4](09-celebrate-a-finished-book.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows the celebration the child sees when she logs the last chapter of a book (journey 9).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: sign in as Nia, log chapter 3 of The BFG, see the confetti and trophy, go back to the shelf and open the finished book |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:13 | Introduction | Title slide |
| 00:13-01:10 | Finishing the book | Screen recording |
| 01:10-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/09-celebrate-a-finished-book
node tools/video-audio/generate-audio.mjs docs/videos/09-celebrate-a-finished-book
node tools/video-build/build-video.mjs docs/videos/09-celebrate-a-finished-book
```

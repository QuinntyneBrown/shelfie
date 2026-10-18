# 04 · Add a book

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [04-add-a-book.mp4](04-add-a-book.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the parent puts a new book on the shelf (journey 4).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: sign in as Dad, Books, Add a book, The Hobbit with a peach cover and dragon sticker, the toast and the book under Up next |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:17 | Introduction | Title slide |
| 00:17-01:16 | Adding the book | Screen recording |
| 01:16-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts 04-add-a-book
node tools/video-audio/generate-audio.mjs docs/videos/04-add-a-book
node tools/video-build/build-video.mjs docs/videos/04-add-a-book
```

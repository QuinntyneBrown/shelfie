# 11 · View a book

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [11-view-a-book.mp4](11-view-a-book.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows a book's page: its progress, every chapter with its review status, and the next chapter to log (journey 11).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | `inside-a-book`: The Lion, the Witch and the Wardrobe at 11 of 17, Dad read it, Waiting for Dad, Up next |
| `clips/clips.spec.ts` | `long-and-finished-books`: The Wild Robot folding after chapter 10, Charlotte's Web with its reward |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:10 | Introduction | Title slide |
| 00:10-00:55 | Inside a book | Screen recording |
| 00:55-01:20 | Long and finished books | Screen recording |
| 01:20-end | Recap | Four reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts
node tools/video-audio/generate-audio.mjs docs/videos/11-view-a-book
node tools/video-build/build-video.mjs docs/videos/11-view-a-book
```

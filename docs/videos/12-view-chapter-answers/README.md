# 12 · View chapter answers

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [12-view-chapter-answers.mp4](12-view-chapter-answers.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the child reopens a logged chapter to read her answers and, once Dad has reviewed it, his sticker and note (journey 12).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | `read-back-answers`: chapter 10 waiting for Dad, her answers read-only, on to chapter 11 and back to the book |
| `clips/clips.spec.ts` | `see-dads-feedback`: the shelf banner for chapter 11's Wise owl, then the chapter with Dad's note |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:12 | Introduction | Title slide |
| 00:12-00:50 | Reading back her answers | Screen recording |
| 00:50-01:15 | Seeing Dad's feedback | Screen recording |
| 01:15-end | Recap | Four reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts
node tools/video-audio/generate-audio.mjs docs/videos/12-view-chapter-answers
node tools/video-build/build-video.mjs docs/videos/12-view-chapter-answers
```

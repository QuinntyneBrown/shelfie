# 06 · Review a chapter

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [06-review-a-chapter.mp4](06-review-a-chapter.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows the grown-up's side of the loop: reading a logged chapter and sending feedback (journey 6).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: sign in as Dad, open chapter 11, pick the Wise owl, add a note, send, see the next chapter offered |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:17 | Introduction | Title slide |
| 00:17-01:20 | Reviewing the chapter | Screen recording |
| 01:20-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/06-review-a-chapter
node tools/video-audio/generate-audio.mjs docs/videos/06-review-a-chapter
node tools/video-build/build-video.mjs docs/videos/06-review-a-chapter
```

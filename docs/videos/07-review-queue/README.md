# 07 · Review queue

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [07-review-queue.mp4](07-review-queue.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the grown-up sees what is waiting for him: chapters to review and books to reward (journey 7).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recordings: Dad's Review page with its summary, badge, This week, Waiting for you, reward card and Recent activity; then the All caught up state |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:15 | Introduction | Title slide |
| 00:15-01:05 | The queue | Screen recording |
| 01:05-01:17 | All caught up | Screen recording |
| 01:17-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/07-review-queue
node tools/video-audio/generate-audio.mjs docs/videos/07-review-queue
node tools/video-build/build-video.mjs docs/videos/07-review-queue
```

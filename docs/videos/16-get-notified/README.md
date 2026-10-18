# 16 · Get notified

> **Runtime:** ~1 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [16-get-notified.mp4](16-get-notified.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows the toasts for success and errors (journey 16).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `toasts-for-success-and-errors` | Real-app recording: saving chapter 12 fails, the danger toast stays with Retry, Retry saves and the success toast offers Undo |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:12 | Introduction | Title slide |
| 00:12-00:50 | Toasts for success and errors | Screen recording |
| 00:50-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/16-get-notified
node tools/video-audio/generate-audio.mjs docs/videos/16-get-notified
node tools/video-build/build-video.mjs docs/videos/16-get-notified
```

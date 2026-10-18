# 17 · Work offline

> **Runtime:** ~1.2 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [17-work-offline.mp4](17-work-offline.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how Nia keeps logging when the connection drops (journey 17).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `keep-logging-offline` | Real-app recording: the connection drops while Nia logs chapter 12, the offline banner and toast, Will send on the book, then the chapter is sent when she is back online |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:10 | Introduction | Title slide |
| 00:10-00:55 | Logging without a connection | Screen recording |
| 00:55-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/17-work-offline
node tools/video-audio/generate-audio.mjs docs/videos/17-work-offline
node tools/video-build/build-video.mjs docs/videos/17-work-offline
```

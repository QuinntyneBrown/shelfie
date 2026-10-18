# 22 · Choose appearance

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [22-choose-appearance.mp4](22-choose-appearance.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the household's theme is chosen in Settings and followed on every device (journey 22).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: Dad on a light laptop saves Always dark, reloads, then goes back to Match the device and the app follows the device |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:12 | Introduction | Title slide |
| 00:12-01:10 | Choosing the appearance | Screen recording |
| 01:10-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/22-choose-appearance
node tools/video-audio/generate-audio.mjs docs/videos/22-choose-appearance
node tools/video-build/build-video.mjs docs/videos/22-choose-appearance
```

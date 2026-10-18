# 02 · Sign in with PIN

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [02-sign-in-with-pin.mp4](02-sign-in-with-pin.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the child gets from the sign-in screen to her shelf with her name and PIN (journey 2).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording at phone width: pick Nia, a wrong PIN and its message, then 1234 and her shelf |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:18 | Introduction | Title slide |
| 00:18-01:13 | Signing in with her PIN | Screen recording (phone) |
| 01:13-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts 02-sign-in-with-pin
node tools/video-audio/generate-audio.mjs docs/videos/02-sign-in-with-pin
node tools/video-build/build-video.mjs docs/videos/02-sign-in-with-pin
```

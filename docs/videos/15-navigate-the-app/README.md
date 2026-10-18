# 15 · Navigate the app

> **Runtime:** ~1.2 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [15-navigate-the-app.mp4](15-navigate-the-app.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how to move between screens on any device: the top bar on wide screens and the tab bar on phones (journey 15).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `navigate-on-a-desktop` | Real-app recording at desktop width: Dad moves between Review, Books and Settings from the top bar and opens his account menu |
| `clips/clips.spec.ts` `navigate-on-a-phone` | Real-app recording at 390px: the same three places from the bottom tab bar |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:10 | Introduction | Title slide |
| 00:10-00:45 | On a desktop | Screen recording |
| 00:45-01:05 | On a phone | Phone-width screen recording |
| 01:05-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/15-navigate-the-app
node tools/video-audio/generate-audio.mjs docs/videos/15-navigate-the-app
node tools/video-build/build-video.mjs docs/videos/15-navigate-the-app
```

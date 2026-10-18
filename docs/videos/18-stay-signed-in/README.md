# 18 · Stay signed in

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [18-stay-signed-in.mp4](18-stay-signed-in.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows that a session survives a reload, ends after thirty quiet days with a clear note, and that Sign out really ends it (journey 18).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `stay-signed-in` | Real-app recording: Nia signs in, reloads, her session expires, the sign-in page says You were signed out, she carries on with her PIN |
| `clips/clips.spec.ts` `sign-out` | Real-app recording: Nia signs out from the account menu; opening the shelf leads to sign-in |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:12 | Introduction | Title slide |
| 00:12-00:55 | Staying signed in | Screen recording |
| 00:55-01:20 | Signing out | Screen recording |
| 01:20-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/18-stay-signed-in
node tools/video-audio/generate-audio.mjs docs/videos/18-stay-signed-in
node tools/video-build/build-video.mjs docs/videos/18-stay-signed-in
```

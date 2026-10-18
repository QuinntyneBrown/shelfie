# 20 · Reset password

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [20-reset-password.mp4](20-reset-password.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how a grown-up who forgot his password gets a reset link by e-mail and chooses a new one (journey 20). The local mail sink stands in for e-mail.

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `reset-password` | Real-app recording: Forgot your password?, Send reset link, the confirmation, the link from the local mailbox, Choose a new password, Password updated, Go to Review |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:10 | Introduction | Title slide |
| 00:10-01:20 | Resetting the password | Screen recording |
| 01:20-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/20-reset-password
node tools/video-audio/generate-audio.mjs docs/videos/20-reset-password
node tools/video-build/build-video.mjs docs/videos/20-reset-password
```

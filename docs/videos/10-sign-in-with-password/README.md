# 10 · Sign in with password

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [10-sign-in-with-password.mp4](10-sign-in-with-password.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the grown-up signs in with e-mail and password, on a new browser and on one he has used before (journey 10).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | `first-sign-in`: Welcome back, a wrong password and its error, then the right one and Review |
| `clips/clips.spec.ts` | `returning-sign-in`: pick Dad on Who's reading today?, type only the password, land on Review |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:14 | Introduction | Title slide |
| 00:14-01:05 | Signing in with a password | Two screen recordings |
| 01:05-end | Recap | Four reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts
node tools/video-audio/generate-audio.mjs docs/videos/10-sign-in-with-password
node tools/video-build/build-video.mjs docs/videos/10-sign-in-with-password
```

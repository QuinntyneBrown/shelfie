# 23 · Secure the API

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [23-secure-the-api.mp4](23-secure-the-api.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the API refuses abuse and protects the household's data (journey 23). There is no screen for this, so the clips show the real refusals in the browser.

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | `secure-the-api-signed-out`: a signed-out tab opens `/api/shelf` and is refused; after ten password tries the sign-in page says Too many tries |
| `clips/clips.spec.ts` | `secure-the-api-pin-lock`: five wrong PINs lock Nia's keypad for five minutes |
| `clips/clips.spec.ts` | `secure-the-api-signed-in`: Nia opens Review and is told it is for grown-ups; an answer with tags in it shows as plain text |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:15 | Introduction | Title slide |
| 00:15-00:50 | Keeping strangers out | Two screen recordings |
| 00:50-01:20 | Keeping data safe | Screen recording |
| 01:20-end | Recap | Four reminders from the API tests |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/23-secure-the-api
node tools/video-audio/generate-audio.mjs docs/videos/23-secure-the-api
node tools/video-build/build-video.mjs docs/videos/23-secure-the-api
```

# 25 · Meet Shelfie

> **Runtime:** ~1 min · **Audience:** families visiting www.shelfie.kids · **Prerequisites:** none

**Video:** [25-meet-shelfie.mp4](25-meet-shelfie.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
The brand video on the marketing page (`apps/marketing/index.html`, "Shelfie in one minute"): the whole loop in a minute, the way Beanstack's home-page video tells its story. Slides are the design system (`../assets/brand.css` loads `docs/design-system` tokens and components at 2x); screens are the real app with real covers; the voice is Azure Speech's `en-US-JennyNeural` in its cheerful style. It was first narrated by the free Kokoro-82M `af_heart` voice at speed 0.9; `../README.md` ("Voices") has both engines, the key, and how to switch back.

## Assets on screen
| File | What to show |
|---|---|
| `slides.html` | Wordmark and tagline; the streak, badges, progress and Olive components; the closing call to action |
| `clips/clips.spec.ts` | Real-app recordings with Open Library covers: Nia's shelf; logging Lion chapter 12 with Olive; Dad reviewing chapter 11 with a Wise owl sticker; finishing The BFG |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:10 | Introduction | Wordmark, "Every chapter, rewarded.", kids log and grown-ups cheer |
| 00:10-00:24 | The shelf | Recording: on the go, up next, finished |
| 00:24-00:40 | Log a chapter | Recording: one tap, Olive's questions, I'm done |
| 00:40-00:51 | Streaks and badges | Design-system cards: streak, badges, progress, Olive |
| 00:51-01:02 | Grown-ups | Recording: review, sticker, note, send |
| 01:02-01:13 | Rewards | Recording: last chapter of The BFG, the party |
| 01:13-01:22 | Outro | Wordmark, Start reading free, www.shelfie.kids |

## Demo commands
One worker, so the clips are not slowed by recording side by side; no burned-in captions on the marketing page.
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts 25-meet-shelfie --workers=1 && cd ..
node tools/video-audio/generate-audio.mjs docs/videos/25-meet-shelfie --engine azure
node tools/video-build/build-video.mjs docs/videos/25-meet-shelfie --no-captions
cp docs/videos/25-meet-shelfie/25-meet-shelfie.mp4 apps/marketing/assets/video/meet-shelfie.mp4
```

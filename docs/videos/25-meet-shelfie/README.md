# 25 · Meet Shelfie

> **Runtime:** ~1 min · **Audience:** families visiting www.shelfie.kids · **Prerequisites:** none

**Video:** [25-meet-shelfie.mp4](25-meet-shelfie.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
The brand video on the marketing page (`apps/marketing/index.html`, "Shelfie in one minute"): the whole loop in a minute, the way Beanstack's home-page video tells its story. Slides are the design system (`../assets/brand.css` loads `docs/design-system` tokens and components at 2x); screens are the real app with real covers.

## Assets on screen
| File | What to show |
|---|---|
| `slides.html` | Wordmark and tagline; the streak, badges, progress and Olive components; the closing call to action |
| `clips/clips.spec.ts` | Real-app recordings with Open Library covers: Nia's shelf; logging Lion chapter 12 with Olive; Dad reviewing chapter 11 with a Wise owl sticker; finishing The BFG |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:10 | Introduction | Wordmark, "Every chapter, rewarded.", kids log and grown-ups cheer |
| 00:10-00:22 | The shelf | Recording: on the go, up next, finished |
| 00:22-00:36 | Log a chapter | Recording: one tap, Olive's questions, I'm done |
| 00:36-00:48 | Streaks and badges | Design-system cards: streak, badges, progress, Olive |
| 00:48-00:59 | Grown-ups | Recording: review, sticker, note, send |
| 00:59-01:10 | Rewards | Recording: last chapter of The BFG, the party |
| 01:10-end | Outro | Wordmark, Start reading free, www.shelfie.kids |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts 25-meet-shelfie && cd ..
KOKORO_SPEED=0.9 node tools/video-audio/generate-audio.mjs docs/videos/25-meet-shelfie
node tools/video-build/build-video.mjs docs/videos/25-meet-shelfie
cp docs/videos/25-meet-shelfie/25-meet-shelfie.mp4 apps/marketing/assets/video/meet-shelfie.mp4
```

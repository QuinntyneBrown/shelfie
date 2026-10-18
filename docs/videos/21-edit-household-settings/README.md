# 21 · Edit household settings

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [21-edit-household-settings.mp4](21-edit-household-settings.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the grown-up manages the household in Settings: Nia's colour and PIN, and what she sees at her next sign-in (journey 21).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `change-colour-and-pin` | Real-app recording: Dad opens Settings, picks Mint, sets a new PIN, saves; Switch reader, the old PIN fails, the new one opens Nia's shelf |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:12 | Introduction | Title slide |
| 00:12-01:07 | Changing Nia's colour and PIN | Screen recording |
| 01:07-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/21-edit-household-settings
node tools/video-audio/generate-audio.mjs docs/videos/21-edit-household-settings
node tools/video-build/build-video.mjs docs/videos/21-edit-household-settings
```

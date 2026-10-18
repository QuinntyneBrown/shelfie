# 08 · Give a reward

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [08-give-a-reward.mp4](08-give-a-reward.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the grown-up rewards a finished book and where the child sees it (journey 8).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: sign in as Dad, give Matilda the Movie night reward, switch reader to Nia, see it on her shelf and on the book's trophy card |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:14 | Introduction | Title slide |
| 00:14-01:15 | Giving the reward | Screen recording |
| 01:15-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/08-give-a-reward
node tools/video-audio/generate-audio.mjs docs/videos/08-give-a-reward
node tools/video-build/build-video.mjs docs/videos/08-give-a-reward
```

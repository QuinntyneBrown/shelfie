# 13 · Track streak

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [13-track-streak.mp4](13-track-streak.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows the child's daily reading streak and how the days are counted (journey 13).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | `five-day-streak`: the top-bar badge at 5 days and the shelf's 5-day streak line |
| `clips/clips.spec.ts` | `streak-back-to-zero`: last read two days ago, the badge shows 0 days |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:11 | Introduction | Title slide |
| 00:11-00:40 | Watching the streak | Screen recording |
| 00:40-01:05 | How the days count | Rules slide, then screen recording |
| 01:05-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts
node tools/video-audio/generate-audio.mjs docs/videos/13-track-streak
node tools/video-build/build-video.mjs docs/videos/13-track-streak
```

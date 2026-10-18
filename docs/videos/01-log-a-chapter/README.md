# 01 · Log a chapter

> **Runtime:** ~1 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [01-log-a-chapter.mp4](01-log-a-chapter.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows the child's core loop: logging a chapter and answering its questions (journey 1).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: sign in as Nia, log chapter 12, see the celebration and Undo toast |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:12 | Introduction | Title slide |
| 00:12-00:55 | Logging the chapter | Screen recording |
| 00:55-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts
node tools/video-audio/generate-audio.mjs docs/videos/01-log-a-chapter
node tools/video-build/build-video.mjs docs/videos/01-log-a-chapter
```

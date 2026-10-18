# 03 · Browse the shelf

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [03-browse-the-shelf.mp4](03-browse-the-shelf.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the child reads her shelf at a glance and picks a book (journey 3).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: sign in as Nia, On the go, Up next and Finished, then open The Lion, the Witch and the Wardrobe |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:17 | Introduction | Title slide |
| 00:17-01:22 | Browsing the shelf | Screen recording |
| 01:22-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts 03-browse-the-shelf
node tools/video-audio/generate-audio.mjs docs/videos/03-browse-the-shelf
node tools/video-build/build-video.mjs docs/videos/03-browse-the-shelf
```

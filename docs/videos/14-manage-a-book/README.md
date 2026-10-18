# 14 · Manage a book

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [14-manage-a-book.mp4](14-manage-a-book.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how the parent edits or removes a book (journey 14).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `edit-a-book` | Real-app recording: Dad opens Books, sets Because of Winn-Dixie to 26 chapters and saves, then sees the Lion's logged chapters and the error for a count below 11 |
| `clips/clips.spec.ts` `remove-a-book` | Real-app recording: Dad removes Because of Winn-Dixie through the Remove dialog and sees the toast on Books |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:12 | Introduction | Title slide |
| 00:12-01:05 | Editing a book | Screen recording |
| 01:05-01:30 | Removing a book | Screen recording |
| 01:30-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/14-manage-a-book
node tools/video-audio/generate-audio.mjs docs/videos/14-manage-a-book
node tools/video-build/build-video.mjs docs/videos/14-manage-a-book
```

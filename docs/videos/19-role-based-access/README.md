# 19 · Role-based access

> **Runtime:** ~1.5 min · **Audience:** Dad and anyone learning the app · **Prerequisites:** none

**Video:** [19-role-based-access.mp4](19-role-based-access.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows that Nia and Dad each see only their own screens, that error pages lead each of them home, and that one family never sees another's books (journey 19).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` `nia-meets-the-lock` | Real-app recording: Nia opens Review by address, sees This part is for grown-ups, goes back to her shelf; then an unknown address shows We can't find that page |
| `clips/clips.spec.ts` `dad-finds-review` | Real-app recording: Dad lands on Review, opens an unknown address, and Go to Review takes him back |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:14 | Introduction | Title slide |
| 00:14-00:50 | Nia stays on her shelf | Screen recording |
| 00:50-01:10 | Dad finds his way back | Screen recording |
| 01:10-01:22 | Dad finds his way back | Household isolation slide |
| 01:22-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/19-role-based-access
node tools/video-audio/generate-audio.mjs docs/videos/19-role-based-access
node tools/video-build/build-video.mjs docs/videos/19-role-based-access
```

# Journey videos

One narrated video per journey in [user-journeys.md](../user-journeys.md), built from screen recordings of the real app.

| # | Journey | Video | Transcript |
|---|---|---|---|
| 1 | Log a chapter | [01-log-a-chapter.mp4](01-log-a-chapter/01-log-a-chapter.mp4) | [script](01-log-a-chapter/script.md) |
| 2 | Sign in with PIN | [02-sign-in-with-pin.mp4](02-sign-in-with-pin/02-sign-in-with-pin.mp4) | [script](02-sign-in-with-pin/script.md) |
| 3 | Browse the shelf | [03-browse-the-shelf.mp4](03-browse-the-shelf/03-browse-the-shelf.mp4) | [script](03-browse-the-shelf/script.md) |
| 4 | Add a book | [04-add-a-book.mp4](04-add-a-book/04-add-a-book.mp4) | [script](04-add-a-book/script.md) |
| 5 | Manage questions | [05-manage-questions.mp4](05-manage-questions/05-manage-questions.mp4) | [script](05-manage-questions/script.md) |
| 6 | Review a chapter | [06-review-a-chapter.mp4](06-review-a-chapter/06-review-a-chapter.mp4) | [script](06-review-a-chapter/script.md) |
| 7 | Review queue | [07-review-queue.mp4](07-review-queue/07-review-queue.mp4) | [script](07-review-queue/script.md) |
| 8 | Give a reward | [08-give-a-reward.mp4](08-give-a-reward/08-give-a-reward.mp4) | [script](08-give-a-reward/script.md) |
| 9 | Celebrate a finished book | [09-celebrate-a-finished-book.mp4](09-celebrate-a-finished-book/09-celebrate-a-finished-book.mp4) | [script](09-celebrate-a-finished-book/script.md) |
| 10 | Sign in with password | [10-sign-in-with-password.mp4](10-sign-in-with-password/10-sign-in-with-password.mp4) | [script](10-sign-in-with-password/script.md) |
| 11 | View a book | [11-view-a-book.mp4](11-view-a-book/11-view-a-book.mp4) | [script](11-view-a-book/script.md) |
| 12 | View chapter answers | [12-view-chapter-answers.mp4](12-view-chapter-answers/12-view-chapter-answers.mp4) | [script](12-view-chapter-answers/script.md) |
| 13 | Track streak | [13-track-streak.mp4](13-track-streak/13-track-streak.mp4) | [script](13-track-streak/script.md) |
| 14 | Manage a book | [14-manage-a-book.mp4](14-manage-a-book/14-manage-a-book.mp4) | [script](14-manage-a-book/script.md) |
| 15 | Navigate the app | [15-navigate-the-app.mp4](15-navigate-the-app/15-navigate-the-app.mp4) | [script](15-navigate-the-app/script.md) |
| 16 | Get notified | [16-get-notified.mp4](16-get-notified/16-get-notified.mp4) | [script](16-get-notified/script.md) |
| 17 | Work offline | [17-work-offline.mp4](17-work-offline/17-work-offline.mp4) | [script](17-work-offline/script.md) |
| 18 | Stay signed in | [18-stay-signed-in.mp4](18-stay-signed-in/18-stay-signed-in.mp4) | [script](18-stay-signed-in/script.md) |
| 19 | Role-based access | [19-role-based-access.mp4](19-role-based-access/19-role-based-access.mp4) | [script](19-role-based-access/script.md) |
| 20 | Reset password | [20-reset-password.mp4](20-reset-password/20-reset-password.mp4) | [script](20-reset-password/script.md) |
| 21 | Edit household settings | [21-edit-household-settings.mp4](21-edit-household-settings/21-edit-household-settings.mp4) | [script](21-edit-household-settings/script.md) |
| 22 | Choose appearance | [22-choose-appearance.mp4](22-choose-appearance/22-choose-appearance.mp4) | [script](22-choose-appearance/script.md) |
| 23 | Secure the API | [23-secure-the-api.mp4](23-secure-the-api/23-secure-the-api.mp4) | [script](23-secure-the-api/script.md) |
| 24 | Operate the service | [24-operate-the-service.mp4](24-operate-the-service/24-operate-the-service.mp4) | [script](24-operate-the-service/script.md) |

Also [25-meet-shelfie](25-meet-shelfie/README.md): the one-minute brand video on www.shelfie.kids, with slides built from the design system (`assets/brand.css`).

## Building

Needs Node 24, Chrome (Playwright), `ffmpeg-full` (libass, for captions) and a Python 3.12 venv in `.cache/venv` with `kokoro` and `soundfile` (voice: Kokoro-82M `af_heart` from Hugging Face, run offline).

```sh
# 1. Record every clip against the real app (fresh seeded database per clip)
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts && cd ..
# 2. Narration and timing manifest
node tools/video-audio/generate-audio.mjs docs/videos/NN-name
# 3. Slides + clips + audio + captions -> NN-name.mp4 (--check, --slides-only)
node tools/video-build/build-video.mjs docs/videos/NN-name
```

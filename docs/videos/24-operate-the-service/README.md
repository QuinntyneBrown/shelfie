# 24 · Operate the service

> **Runtime:** ~1.5 min · **Audience:** Dad as the operator · **Prerequisites:** [docs/runbook.md](../../runbook.md)

**Video:** [24-operate-the-service.mp4](24-operate-the-service.mp4) · [Slides](slides.html) · [Transcript](script.md)

## Why this video exists
Shows how to tell Shelfie is up, where its logs are and how the database is backed up (journey 24).

## Assets on screen
| File | What to show |
|---|---|
| `clips/clips.spec.ts` | Real-app recording: the browser opens `/api/health` and it answers `{"status":"ok"}` |
| `infra/host/deploy.sh` | The health check after a deploy and the roll back when it fails |
| `docs/runbook.md` | The `journalctl` commands for the API, Caddy and backups |
| `infra/host/shelfie-backup.cron` | The nightly backup at 08:15 UTC |

## Run sheet
| Time | Segment | Content |
|---|---|---|
| 00:00-00:15 | Introduction | Title slide |
| 00:15-00:40 | Health checks | Screen recording, then the health answers and deploy check |
| 00:40-01:20 | Logs and backups | journald commands, then the backup cron line |
| 01:20-end | Recap | Three reminders |

## Demo commands
```sh
cd e2e && npx playwright test -c ../tools/video-record/playwright.config.ts ../docs/videos/24-operate-the-service
node tools/video-audio/generate-audio.mjs docs/videos/24-operate-the-service
node tools/video-build/build-video.mjs docs/videos/24-operate-the-service
```

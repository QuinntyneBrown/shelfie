# Suggested questions video

`suggested-questions.mp4` (34 s, 1080p, captions burned in, chapters) walks through suggested questions on Manage book (L2-069 to L2-073): asking for ideas, ticking and rewording them, adding them, and the "not switched on" state. The picture is the real app, recorded in Chromium. The voice is Kokoro-82M (`af_heart`), run locally.

The ideas shown come from the e2e stand-in for Claude (`e2e/support/suggestions.ts`), and the last scene fakes the 503 a server without an AI key returns.

## Rerun

Same tools as `../feature-enchancements/README.md`. `build.py` still names its output `feature-enhancements.mp4`.

```
npm run build                                    # from the repo root
mkdir out && mkdir out/raw
python narrate.py <models dir> <abs path to out> # scenes.json -> out/*.wav + out/scenes.json
VIDEO_OUT=<abs path to out> node ../../../node_modules/@playwright/test/cli.js test -c playwright.config.ts
VIDEO_OUT=<abs path to out> python build.py
```

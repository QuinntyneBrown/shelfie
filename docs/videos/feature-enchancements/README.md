# Feature enhancements video

`feature-enhancements.mp4` (58 s, 1080p, captions burned in, chapters) walks through the two enhancements that just landed: book cover pictures (L2-046 to L2-048) and the AI review assistant (L2-064 to L2-068). The picture is the real app, recorded in Chromium. The voice is Kokoro-82M (`af_heart`, Apache-2.0, from Hugging Face), run locally.

The review assistant scenes use the e2e stand-in for Claude (`e2e/support/assistant.ts`), so the advice shown is canned, not model output.

## Rerun

Needs Node 24, Postgres on `DATABASE_URL` (default `localhost:5432`), ffmpeg, and Python with `kokoro-onnx` and `soundfile`. Fetch `kokoro-v1.0.onnx` ([onnx-community/Kokoro-82M-v1.0-ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX), `onnx/model.onnx`) and `voices-v1.0.bin` ([kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)) into `models/` beside where you run `narrate.py`.

```
npm run build                                    # from the repo root
mkdir out && mkdir out/raw
python narrate.py                                # scenes.json -> out/*.wav + out/scenes.json
VIDEO_OUT=<abs path to out> node ../../../node_modules/@playwright/test/cli.js test -c playwright.config.ts
VIDEO_OUT=<abs path to out> python build.py      # clips + audio -> out/feature-enhancements.mp4
```

Edit the narration in `scenes.json`; the capture waits for each scene's voice to finish.

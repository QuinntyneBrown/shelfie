# Book autocomplete video

`book-autocomplete.mp4` (38 s, 1080p, captions burned in, chapters) walks through the title lookup on Add a book (L2-075 to L2-077 and its lookup states): matches with covers, picking one to fill author and cover, labelled AI guesses, and the failed-lookup note. The picture is the real app, recorded in Chromium. The voice is Kokoro-82M (`af_heart`), run locally.

The matches, guesses and covers come from the e2e stand-ins in `e2e/support/lookup.ts`, not Open Library or Claude.

## Rerun

Same tools and commands as `../suggested-questions/README.md`. `build.py` still names its output `feature-enhancements.mp4`.

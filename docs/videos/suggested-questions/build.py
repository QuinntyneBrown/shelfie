"""Joins the scene clips and narration in VIDEO_OUT into feature-enhancements.mp4, with captions, chapters and a poster."""
import json, os, re, subprocess, sys

out = os.environ["VIDEO_OUT"]
scenes = json.load(open(os.path.join(out, "scenes.json")))
LEAD = 0.4  # seconds of picture before the voice starts


def run(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True, cwd=out)


def srt_time(t):
    return f"{int(t // 3600):02}:{int(t % 3600 // 60):02}:{int(t % 60):02},{int(t % 1 * 1000):03}"


cues, chapters, start, parts = [], [], 0.0, []
for s in scenes:
    clip = f"{s['id']}.mp4"
    length = os.path.getsize(os.path.join(out, f"{s['id']}.webm")) and float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{s['id']}.webm"], cwd=out, text=True))
    run("-i", f"{s['id']}.webm", "-i", f"{s['id']}.wav", "-filter_complex",
        f"[0:v]scale=1920:1080:flags=lanczos,fps=30,format=yuv420p[v];[1:a]adelay={int(LEAD * 1000)}|{int(LEAD * 1000)},apad[a]",
        "-map", "[v]", "-map", "[a]", "-t", f"{length:.2f}", "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-ar", "48000", clip)
    sentences = re.split(r"(?<=[.!?])\s+", s["text"])
    total, t = sum(len(x) for x in sentences), start + LEAD
    for x in sentences:
        d = s["dur"] * len(x) / total
        cues.append((t, t + d, x))
        t += d
    chapters.append((start, s["title"]))
    parts.append(clip)
    start += length

with open(os.path.join(out, "captions.srt"), "w", encoding="utf-8") as f:
    for i, (a, b, x) in enumerate(cues, 1):
        f.write(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n{x}\n\n")
with open(os.path.join(out, "list.txt"), "w") as f:
    f.writelines(f"file '{p}'\n" for p in parts)
with open(os.path.join(out, "chapters.txt"), "w", encoding="utf-8") as f:
    f.write(";FFMETADATA1\n")
    for i, (a, title) in enumerate(chapters):
        end = chapters[i + 1][0] if i + 1 < len(chapters) else start
        f.write(f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={int(a * 1000)}\nEND={int(end * 1000)}\ntitle={title}\n")

run("-f", "concat", "-i", "list.txt", "-i", "chapters.txt", "-map_metadata", "1", "-vf",
    "subtitles=captions.srt:force_style='FontName=Segoe UI,FontSize=9,Outline=1,MarginV=10'",
    "-c:v", "libx264", "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", "feature-enhancements.mp4")
run("-ss", "3", "-i", "feature-enhancements.mp4", "-frames:v", "1", "poster.png")
print("done", round(start, 1), "seconds")

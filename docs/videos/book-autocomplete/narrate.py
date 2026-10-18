"""Voices every scene in scenes.json with Kokoro: python narrate.py <models dir> <out dir>"""
import json, os, sys, soundfile as sf
from kokoro_onnx import Kokoro

models, out = sys.argv[1:3]
k = Kokoro(os.path.join(models, "kokoro-v1.0.onnx"), os.path.join(models, "voices-v1.0.bin"))
scenes = json.load(open(os.path.join(os.path.dirname(__file__), "scenes.json")))
for s in scenes:
    a, sr = k.create(s["text"], voice="af_heart", speed=0.95, lang="en-us")
    sf.write(os.path.join(out, f"{s['id']}.wav"), a, sr)
    s["dur"] = round(len(a) / sr, 2)
    print(s["id"], s["dur"])
json.dump(scenes, open(os.path.join(out, "scenes.json"), "w"), indent=1)

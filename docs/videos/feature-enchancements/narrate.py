import json, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
scenes = json.load(open("scenes.json"))
for s in scenes:
    a, sr = k.create(s["text"], voice="af_heart", speed=0.95, lang="en-us")
    sf.write(f"out/{s['id']}.wav", a, sr)
    s["dur"] = round(len(a)/sr, 2)
    print(s["id"], s["dur"])
json.dump(scenes, open("out/scenes.json","w"), indent=1)

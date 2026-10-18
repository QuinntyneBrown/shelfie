"""Synthesize several texts to WAVs with Kokoro-82M, loading the model once.
Usage: kokoro_say.py VOICE SPEED < jobs.json   (jobs: [{"out": "a.wav", "text": "..."}])"""
import json
import sys
import numpy as np
import soundfile as sf
from kokoro import KPipeline

voice, speed = sys.argv[1], float(sys.argv[2])
pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
for job in json.load(sys.stdin):
    chunks = [audio.numpy() for _, _, audio in pipeline(job["text"], voice=voice, speed=speed)]
    sf.write(job["out"], np.concatenate(chunks), 24000)

// Usage: node tools/video-build/build-video.mjs <video-folder> [--check | --slides-only] [--no-captions]
// Renders each slide of slides.html at 1920x1080, drops the screen recordings (.cache/clips) into the
// clip slides, times everything to the audio manifest and burns in captions (unless --no-captions): <folder>/<name>.mp4.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const folder = resolve(process.argv[2] ?? '');
const name = basename(folder);
const check = process.argv.includes('--check');
const slidesOnly = process.argv.includes('--slides-only');
const captions = !process.argv.includes('--no-captions');
const cache = join(root, '.cache', name);
mkdirSync(cache, { recursive: true });
const manifest = JSON.parse(readFileSync(join(cache, 'manifest.json'), 'utf8'));
const url = (n) => `${pathToFileURL(join(folder, 'slides.html'))}?slide=${n}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(url(0));
const count = Number(await page.evaluate(() => document.documentElement.dataset.ready));

// Resolve each slide's cue to a time: exact paragraph start plus a share of its duration by position in the text.
const slides = [];
for (let i = 0; i < count; i++) {
  await page.goto(url(i));
  const info = await page.evaluate(() => {
    const s = document.querySelector('section.active');
    const frame = s.querySelector('.clip-frame')?.getBoundingClientRect();
    return { cue: s.dataset.cue ?? null, clip: s.dataset.clip ?? null, frame: frame && { x: frame.x, y: frame.y, w: frame.width, h: frame.height } };
  });
  let start = 0;
  if (i > 0) {
    if (!info.cue) throw new Error(`Slide ${i} has no data-cue`);
    const p = manifest.paragraphs.find((q) => q.text.replaceAll('`', '').includes(info.cue));
    if (!p) throw new Error(`Cue not found in script: "${info.cue}"`);
    start = p.start + (p.text.indexOf(info.cue) / p.text.length) * (p.end - p.start);
  }
  slides.push({ ...info, start });
}
slides.forEach((s, i) => { s.end = slides[i + 1]?.start ?? manifest.total; });
for (const [i, s] of slides.entries()) {
  if (s.end - s.start < 4) throw new Error(`Slide ${i} is shorter than 4s`);
  console.log(`slide ${i}: ${s.start.toFixed(1)}s-${s.end.toFixed(1)}s${s.clip ? ` clip ${s.clip}` : ''}`);
}
if (check) { await browser.close(); process.exit(0); }

for (let i = 0; i < count; i++) {
  await page.goto(url(i));
  await page.screenshot({ path: join(cache, `slide-${i}.png`) });
}
await browser.close();
if (slidesOnly) process.exit(0);

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { cwd: cache });
const duration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
const encode = ['-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p'];
const clipsDir = join(root, '.cache/recordings');

const segments = slides.map((s, i) => {
  const out = join(cache, `seg-${i}.mp4`);
  const length = String(s.end - s.start);
  if (!s.clip) {
    ffmpeg('-loop', '1', '-framerate', '30', '-t', length, '-i', `slide-${i}.png`, ...encode, out);
    return out;
  }
  // Playwright shortens long folder names, so match the start of the video's folder and the clip at the end.
  const dir = readdirSync(clipsDir).find((d) => d.startsWith(name.slice(0, 20)) && d.endsWith(`-${s.clip}-chromium`));
  if (!dir) throw new Error(`No recording for clip "${s.clip}": run the recorder first`);
  const recording = join(clipsDir, dir, 'video.webm');
  // Stretch or squeeze the recording to the narration within limits; a short one holds its last frame.
  const factor = Math.min(1.8, Math.max(1 / 1.6, (s.end - s.start) / duration(recording)));
  if (factor > 1.3 || factor < 0.8) console.warn(`warning: clip ${s.clip} runs at x${(1 / factor).toFixed(2)}`);
  const { x, y, w, h } = s.frame;
  ffmpeg(
    '-loop', '1', '-framerate', '30', '-i', `slide-${i}.png`, '-i', recording,
    '-filter_complex', `[1:v]setpts=${factor}*PTS,scale=${w}:${h},tpad=stop_mode=clone:stop_duration=${length},fps=30[c];[0:v][c]overlay=${x}:${y}:shortest=1`,
    '-t', length, ...encode, out,
  );
  return out;
});
writeFileSync(join(cache, 'segments.txt'), segments.map((f) => `file '${f}'`).join('\n'));
ffmpeg('-f', 'concat', '-safe', '0', '-i', 'segments.txt', '-c', 'copy', 'silent.mp4');

// Captions: each paragraph's sentences share its time by length.
const stamp = (t) => new Date(t * 1000).toISOString().slice(11, 23).replace('.', ',');
let n = 0;
const srt = manifest.paragraphs.flatMap((p) => {
  const sentences = p.text.replaceAll('`', '').match(/[^.!?]+[.!?]*/g).map((x) => x.trim()).filter(Boolean);
  const total = sentences.reduce((a, x) => a + x.length, 0);
  let t = p.start;
  return sentences.map((x) => {
    const end = t + ((p.end - p.start) * x.length) / total;
    const cue = `${++n}\n${stamp(t)} --> ${stamp(end)}\n${x}\n`;
    t = end;
    return cue;
  });
}).join('\n');
writeFileSync(join(cache, 'captions.srt'), srt);
ffmpeg(
  '-i', 'silent.mp4', '-i', join(folder, `${name}.mp3`),
  ...(captions ? ['-vf', "subtitles=filename=captions.srt:force_style='FontSize=10,Outline=1,MarginV=10'"] : []),
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest',
  join(folder, `${name}.mp4`),
);
console.log(`wrote ${name}.mp4`);

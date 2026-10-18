// Usage: node tools/video-audio/generate-audio.mjs <video-folder> [--dry-run]
// Parses script.md, synthesizes each paragraph with Kokoro (voice af_heart), writes <folder>/<name>.mp3
// and a timing manifest to .cache/<name>/manifest.json that build-video.mjs syncs the slides to.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const folder = resolve(process.argv[2] ?? '');
const dryRun = process.argv.includes('--dry-run');
const name = basename(folder);
const VOICE = process.env.KOKORO_VOICE ?? 'af_heart';
const SPEED = process.env.KOKORO_SPEED ?? '0.8';
const GAP = 0.45;

const lines = readFileSync(join(folder, 'script.md'), 'utf8').split('\n');
if (!/^# \d\d · /.test(lines[0])) throw new Error('script.md must start with "# NN · Title"');

// Items: {section, text} for narration, {section, pause} for [pause Ns].
const items = [];
let section = 'Intro';
let paragraph = [];
const flush = () => {
  if (paragraph.length) items.push({ section, text: paragraph.join(' ') });
  paragraph = [];
};
for (const raw of lines.slice(1)) {
  const line = raw.trim();
  if (/^(\||```|<|!?\[.*\]\(.*\))/.test(line)) throw new Error(`Not allowed in script.md: ${line}`);
  if (line.startsWith('## ')) { flush(); section = line.slice(3); continue; }
  const pause = line.match(/^\[pause (\d+(?:\.\d+)?)s\]$/);
  if (pause) { flush(); items.push({ section, pause: Number(pause[1]) }); continue; }
  if (line === '') { flush(); continue; }
  if (line.startsWith('- ')) { flush(); paragraph.push(line.slice(2)); flush(); continue; }
  paragraph.push(line);
}
flush();

const lexicon = JSON.parse(readFileSync(join(import.meta.dirname, 'pronunciations.json'), 'utf8'));
const spoken = (text) => Object.entries(lexicon).reduce((t, [from, to]) => t.replaceAll(from, to), text.replaceAll('`', ''));

const words = items.reduce((n, i) => n + (i.text ? i.text.split(/\s+/).length : 0), 0);
const estimate = Math.round((words / 150) * 60 + items.reduce((n, i) => n + (i.pause ?? 0), 0));
console.log(`${name}: ${words} words, about ${estimate}s of narration (at normal speed; Kokoro at ${SPEED} runs longer)`);
if (dryRun) process.exit(0);

const cache = join(root, '.cache', name);
mkdirSync(cache, { recursive: true });
const python = join(root, '.cache/venv/bin/python');
const jobs = items.flatMap((item, i) => (item.text ? [{ out: join(cache, `p${i}.wav`), text: spoken(item.text) }] : []));
execFileSync(python, [join(import.meta.dirname, 'kokoro_say.py'), VOICE, SPEED], { input: JSON.stringify(jobs), stdio: ['pipe', 'inherit', 'inherit'] });

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args]);
const duration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
const silence = (seconds, file) => ffmpeg('-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(seconds), file);

silence(GAP, join(cache, 'gap.wav'));
const parts = [];
const manifest = { name, paragraphs: [], total: 0 };
let t = 0;
items.forEach((item, i) => {
  let file;
  if (item.text) {
    file = join(cache, `p${i}.wav`);
    const d = duration(file);
    manifest.paragraphs.push({ section: item.section, text: item.text, start: t, end: t + d });
    t += d;
  } else {
    file = join(cache, `s${i}.wav`);
    silence(item.pause, file);
    t += item.pause;
  }
  parts.push(file, join(cache, 'gap.wav'));
  t += GAP;
});
manifest.total = t;
writeFileSync(join(cache, 'list.txt'), parts.map((f) => `file '${f}'`).join('\n'));
ffmpeg('-f', 'concat', '-safe', '0', '-i', join(cache, 'list.txt'), '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-q:a', '3', join(folder, `${name}.mp3`));
writeFileSync(join(cache, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`wrote ${name}.mp3 (${t.toFixed(1)}s)`);

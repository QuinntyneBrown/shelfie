// Fails when the JavaScript the browser loads first is over 300 kB gzipped (L2-030).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 300;
const dir = 'dist/shelfie/browser';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => m[1]);
const kb = initial.reduce((sum, file) => sum + gzipSync(readFileSync(join(dir, file))).length, 0) / 1024;

console.log(`Initial JavaScript: ${kb.toFixed(1)} kB gzipped (limit ${LIMIT_KB} kB) across ${initial.length} files`);
if (kb > LIMIT_KB) process.exit(1);

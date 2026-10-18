// Traces to: L2-037, L2-040
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Given the database is unreachable when the API starts, then it exits non-zero with one error line that does not carry the password', async () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./main.ts', import.meta.url))], {
    env: { ...process.env, NODE_ENV: 'test', PORT: '0', DATABASE_URL: 'postgres://shelfie_app:hunter2-secret@127.0.0.1:1/shelfie' },
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const code = await new Promise<number | null>((resolve) => child.on('exit', resolve));

  assert.equal(code, 1);
  const errorLines = output.split('\n').filter((line) => line.includes('"level":"error"'));
  assert.equal(errorLines.length, 1, output);
  assert.ok(!output.includes('hunter2-secret'), 'the password is not written');
  assert.ok(!output.includes('api listening'), 'the API never listens');
});

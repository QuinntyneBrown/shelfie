import { execSync } from 'node:child_process';
import { join } from 'node:path';

/** Builds the web app that each worker's server serves. */
export default function buildWebApp() {
  execSync('npm run build', { cwd: join(import.meta.dirname, '../..'), stdio: 'inherit' });
}

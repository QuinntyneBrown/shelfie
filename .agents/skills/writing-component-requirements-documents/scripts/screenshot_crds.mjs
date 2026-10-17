// Screenshot CRD renderings: light and dark, at 1280 and 360 px, full page, and report
// horizontal overflow, failed requests and script errors.
//
//   node screenshot_crds.mjs <playwright-package.json> <outdir> <file.html>...
//   node screenshot_crds.mjs e2e/package.json .cache/crds docs/specs/components/button.html
//
// The first argument is any package.json whose node_modules has @playwright/test (Chromium).
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const [pkg, out, ...files] = process.argv.slice(2);
const require = createRequire(path.resolve(pkg));
const { chromium } = require('@playwright/test');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const file of files) {
  for (const theme of ['light', 'dark']) {
    for (const width of [1280, 360]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('requestfailed', (r) => errors.push(r.url()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(pathToFileURL(path.resolve(file)).href + `?theme=${theme}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const name = `${path.basename(file, '.html')}-${theme}-${width}.png`;
      await page.screenshot({ path: path.join(out, name), fullPage: true });
      console.log(name, overflow ? 'HORIZONTAL OVERFLOW' : 'ok', errors.length ? 'errors: ' + errors.join(', ') : '');
      await page.close();
    }
  }
}
await browser.close();

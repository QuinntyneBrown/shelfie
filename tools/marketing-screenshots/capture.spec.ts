import { join } from 'node:path';
import { test } from '../../e2e/support/test';
import { screens } from '../../e2e/support/screens';

const OUT = join(import.meta.dirname, '../../apps/marketing/assets/screenshots');

// Each marketing screenshot is one of the screens the acceptance tests already know how to open.
const shots = [
  ['shelf', 'shelf'],
  ['log a chapter', 'log-chapter'],
  ['review a chapter', 'review'],
  ['chapter answers', 'answers'],
] as const;

for (const [screen, file] of shots) {
  test(`capture ${file}`, async ({ page }) => {
    await screens.find((s) => s.name === screen)!.open(page);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(OUT, `${file}.png`), animations: 'disabled' });
  });
}

test('capture social-card', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(`file://${join(import.meta.dirname, 'social-card.html')}`);
  await page.screenshot({ path: join(OUT, '../social-card.png'), scale: 'css' });
});

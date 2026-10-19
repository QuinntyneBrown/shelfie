import { join } from 'node:path';
import { test } from '../../e2e/support/test';
import { screens } from '../../e2e/support/screens';
import { signInAsDad } from '../../e2e/support/signed-in';

const OUT = join(import.meta.dirname, '../../apps/marketing/assets/screenshots');

// Each marketing screenshot is one of the screens the acceptance tests already know how to open.
const shots = [
  ['shelf', 'shelf'],
  ['log a chapter', 'log-chapter'],
  ['review a chapter', 'review'],
  ['chapter answers', 'answers'],
] as const;

// The seeded books' real covers, by ISBN, fetched from Open Library at capture time; only the
// screenshots are kept.
const covers = {
  'b-lion': '9780064404990',
  'b-robot': '9780316381994',
  'b-bfg': '9780142410387',
  'b-winn': '9780763644321',
  'b-matilda': '9780142410370',
  'b-web': '9780064400558',
};

test.beforeEach(async ({ page, context }) => {
  await signInAsDad(page);
  for (const [book, isbn] of Object.entries(covers)) {
    const picture = await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);
    if (!picture.ok) throw new Error(`No Open Library cover for ${isbn}`);
    const response = await page.request.put(`/api/books/${book}/cover`, {
      headers: { 'X-Requested-With': 'Shelfie', 'Content-Type': picture.headers.get('content-type') ?? 'image/jpeg' },
      data: Buffer.from(await picture.arrayBuffer()),
    });
    if (!response.ok()) throw new Error(`Cover upload for ${book} failed: ${response.status()}`);
  }
  await context.clearCookies();
});

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

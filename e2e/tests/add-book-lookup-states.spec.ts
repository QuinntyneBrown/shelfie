// Traces to: L2-069, L2-072, L2-073, L2-074
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { AddBookPage } from '../pages/add-book.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given a lookup takes a while, then the Title says it is looking that up, and the form stays hers to fill', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Slow');

  await expect(add.lookupNote()).toHaveText('Looking that up…');
  await expect(add.lookupNote()).toHaveAttribute('aria-busy', 'true');
  await add.authorField().fill('Ada Lark');
  await expect(add.matches()).toHaveText([/Slow Boat to China/]);
  await expect(add.authorField()).toHaveValue('Ada Lark');
});

test('Given nothing matches, then a note says so and the next keystroke clears it; the book is still added by hand', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Zzyzx');

  await expect(add.lookupNote()).toHaveText('No matches. Keep typing, or fill the rest in yourself.');
  await add.typeTitle('Slow Zzyzx Road');
  await expect(add.lookupNote()).toHaveText('Looking that up…');
  await expect(add.lookupNote()).toHaveText('No matches. Keep typing, or fill the rest in yourself.');
  await add.chaptersField().fill('7');
  await add.submit();

  await expect(new ShelfPage(page).book('Up next', 'Slow Zzyzx Road')).toBeVisible();
});

test('Given the catalogue has nothing but the helper has guesses, then they are listed as suggested, with a note, no covers, and a screen reader hears suggestions', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Dragon Rider');

  await expect(add.matches()).toHaveText([/Dragon Rider\s*Cornelia Funke · 56 chapters\s*Suggested/, /Griffin’s Feather\s*Cornelia Funke · 40 chapters\s*Suggested/, /Handbook\s*Unknown author · 12 chapters\s*Suggested/]);
  await expect(add.suggestedNote()).toBeVisible();
  await expect(add.matchPicture('Dragon Rider')).toHaveCount(0);
  await expect(add.lookupAnnouncement()).toHaveText('3 suggestions. Use the up and down arrows to pick one, or keep typing.');
});

test('Given the catalogue and the helper both fail, then a quiet note says Shelfie couldn’t look that up and the book is added by hand as before', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Fail Safe');

  await expect(add.lookupNote()).toHaveText('Shelfie couldn’t look that up. You can still fill it in yourself.');
  await expect(add.matchList()).toHaveCount(0);
  await expect(add.problemSummary()).toHaveCount(0);
  await add.fill({ title: 'Fail Safe', author: 'Eugene Burdick', chapters: 15 });
  await add.submit();

  const shelf = new ShelfPage(page);
  await expect(shelf.toast('Fail Safe is on your shelf under Up next.')).toBeVisible();
  await expect(shelf.book('Up next', 'Fail Safe')).toContainText('Eugene Burdick');
});

test('Given Shelfie cannot be reached for the lookup, then the same quiet note shows and nothing else changes', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.breakLookups();

  await add.typeTitle('Winn');

  await expect(add.lookupNote()).toHaveText('Shelfie couldn’t look that up. You can still fill it in yourself.');
  await expect(add.authorField()).toHaveValue('');
  await expect(add.previewPicture()).toHaveCount(0);
  await expect(add.titleField()).toHaveValue('Winn');
});

test('Given a phone, when the list drops down, then it is as wide as the Title, its rows are tall enough to tap, and nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Dragon Rider');
  await expect(add.matches()).toHaveCount(3);

  expect(await add.listAsWideAsTitle()).toBe(true);
  expect(await add.shortestMatchHeight()).toBeGreaterThanOrEqual(44);
  expect(await add.scrollsSideways()).toBe(false);
});

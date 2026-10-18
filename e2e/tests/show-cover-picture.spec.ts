// Traces to: L2-047
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { breakCoverPictures, uploadCoverViaApi } from '../support/covers';
import { ShelfPage } from '../pages/shelf.page';

const LION = 'The Lion, the Witch and the Wardrobe';

test('Given a book has a cover picture, when Nia opens her shelf, then its card shows the picture', async ({ page }) => {
  await signInAsNia(page);
  await uploadCoverViaApi(page, 'b-lion');
  const shelf = new ShelfPage(page);

  await page.reload();

  await expect(shelf.coverPicture('On the go', LION)).toBeVisible();
  await expect.poll(() => shelf.coverPictureLoaded('On the go', LION)).toBe(true);
  await expect(shelf.coverPicture('On the go', LION)).toHaveAttribute('alt', '');
});

test('Given a book has no cover picture, when Nia opens her shelf, then its card shows its sticker on its colour', async ({ page }) => {
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.cover('On the go', LION)).toHaveText('🦁');
  await expect(shelf.coverPicture('On the go', LION)).toHaveCount(0);
});

test('Given a cover picture cannot load, when Nia opens her shelf, then the sticker shows and no broken image', async ({ page }) => {
  await signInAsDad(page);
  await uploadCoverViaApi(page, 'b-lion');
  await page.context().clearCookies();
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await breakCoverPictures(page);

  await page.reload();

  await expect(shelf.cover('On the go', LION)).toHaveText('🦁');
  await expect(shelf.coverPicture('On the go', LION)).toHaveCount(0);
});

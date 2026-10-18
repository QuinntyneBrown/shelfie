// Traces to: L2-090, L2-091, L2-092
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { AddBookPage } from '../pages/add-book.page';
import { ShelfPage } from '../pages/shelf.page';

async function pickHobbit(page: Parameters<typeof signInAsNia>[0]) {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  add.watchPictureUploads();
  add.watchPickedCovers();
  await add.open();
  await add.typeTitle('Hobb');
  await add.pickMatch('The Hobbit');
  await expect.poll(() => add.previewPictureLoaded()).toBe(true);
  return add;
}

test('Given Nia picked The Hobbit, when she chooses another cover from More covers, then the preview shows it and the book goes on her shelf with it', async ({ page }) => {
  const add = await pickHobbit(page);

  await add.openMoreCovers();

  await expect(add.coversDialog()).toBeVisible();
  await expect(add.galleryCovers()).toHaveCount(3);
  await expect(add.galleryCover(1, 3)).toBeChecked();
  await add.chooseGalleryCover(2, 3);
  await add.useThisCover();

  await expect(add.coversDialog()).toBeHidden();
  await expect(add.moreCoversButton()).toBeFocused();
  await expect.poll(() => add.previewPictureLoaded()).toBe(true);
  expect(add.pickedCovers()).toEqual(['1937', '8739161']);
  await add.chaptersField().fill('19');
  await add.submit();
  const shelf = new ShelfPage(page);
  await expect(shelf.toast('The Hobbit is on your shelf under Up next.')).toBeVisible();
  await expect.poll(() => shelf.coverPictureLoaded('Up next', 'The Hobbit')).toBe(true);
  expect(add.pictureUploadCount()).toBe(1);
});

test('Given Nia opened More covers and chose another, when she cancels, then the picture is the one she had', async ({ page }) => {
  const add = await pickHobbit(page);
  await add.openMoreCovers();
  await add.chooseGalleryCover(2, 3);

  await add.cancelCovers();

  await expect(add.coversDialog()).toBeHidden();
  expect(add.pickedCovers()).toEqual(['1937']);
  await add.openMoreCovers();
  await expect(add.galleryCover(1, 3)).toBeChecked();
});

test('Given Nia is in the gallery, then the arrow keys move between covers and Escape closes it', async ({ page }) => {
  const add = await pickHobbit(page);
  await add.openMoreCovers();
  await add.galleryCover(1, 3).focus();

  await page.keyboard.press('ArrowRight');

  await expect(add.galleryCover(2, 3)).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(add.coversDialog()).toBeHidden();
  await expect(add.moreCoversButton()).toBeFocused();
  expect(add.pickedCovers()).toEqual(['1937']);
});

test('Given a title typed without picking a match, or a suggested match picked, then there is no More covers button', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.typeTitle('Hobb');
  await expect(add.matches()).toHaveCount(1);
  await expect(add.moreCoversButton()).toHaveCount(0);

  await add.typeTitle('dragon');
  await add.pickMatch('Dragon Rider');
  await expect(add.titleField()).toHaveValue('Dragon Rider');
  await expect(add.moreCoversButton()).toHaveCount(0);
});

test('Given Nia picked a book and then changed its title, then More covers goes away', async ({ page }) => {
  const add = await pickHobbit(page);
  await expect(add.moreCoversButton()).toBeVisible();

  await add.typeMoreInTitle(' and more');

  await expect(add.moreCoversButton()).toHaveCount(0);
});

test('Given the catalogue holds no other covers for the book, then the gallery says so and closes', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.typeTitle('Winn-Dixie');
  await add.pickMatch('Because of Winn-Dixie');

  await add.openMoreCovers();

  await expect(add.noOtherCovers()).toBeVisible();
  await add.closeCovers();
  await expect(add.coversDialog()).toBeHidden();
});

test('Given the catalogue cannot list the covers, then the gallery says so, the form is unchanged and the book can still be added', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.typeTitle('Pooh');
  await add.pickMatch('Winnie-the-Pooh');

  await add.openMoreCovers();

  await expect(add.coversFailure()).toBeVisible();
  await add.cancelCovers();
  await expect(add.coversDialog()).toBeHidden();
  await expect(add.titleField()).toHaveValue('Winnie-the-Pooh');
  await add.chaptersField().fill('10');
  await add.submit();
  await expect(new ShelfPage(page).toast('Winnie-the-Pooh is on your shelf under Up next.')).toBeVisible();
});

test('Given a phone-width screen, then the gallery has big enough tiles, no sideways scroll and no serious accessibility problem', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const add = await pickHobbit(page);

  await add.openMoreCovers();

  await expect(add.galleryCovers()).toHaveCount(3);
  await add.coversSettled();
  expect(await add.smallestGalleryTile()).toBeGreaterThanOrEqual(44);
  expect(await add.scrollsSideways()).toBe(false);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});

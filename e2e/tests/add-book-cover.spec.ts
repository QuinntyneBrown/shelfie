// Traces to: L2-046, L2-048
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { coverFixture } from '../support/covers';
import { AddBookPage } from '../pages/add-book.page';
import { ShelfPage } from '../pages/shelf.page';

const HOBBIT = { title: 'The Hobbit', author: 'J. R. R. Tolkien', chapters: 19, colour: 'Peach', sticker: 'Dragon' };

test('Given Nia adds a picture on Add a book, then the preview shows it, and the book goes on her shelf with it', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  add.watchPictureUploads();
  await add.open();
  await add.fill(HOBBIT);

  await add.choosePicture(coverFixture());

  await expect.poll(() => add.previewPictureLoaded()).toBe(true);
  await expect(add.removePictureButton()).toBeVisible();
  expect(add.pictureUploadCount()).toBe(0);
  await add.submit();
  const shelf = new ShelfPage(page);
  await expect(shelf.toast('The Hobbit is on your shelf under Up next.')).toBeVisible();
  await expect.poll(() => shelf.coverPictureLoaded('Up next', 'The Hobbit')).toBe(true);
  expect(add.pictureUploadCount()).toBe(1);
});

test('Given Nia added a picture, when she removes it before adding the book, then the preview shows the sticker and no picture is sent', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  add.watchPictureUploads();
  await add.open();
  await add.fill(HOBBIT);
  await add.choosePicture(coverFixture());

  await add.removePicture();

  await expect(add.previewPicture()).toHaveCount(0);
  await expect(add.previewCover()).toHaveText('🐉');
  await expect(add.pictureChooser()).toBeFocused();
  await add.submit();
  const shelf = new ShelfPage(page);
  await expect(shelf.cover('Up next', 'The Hobbit')).toHaveText('🐉');
  await expect(shelf.coverPicture('Up next', 'The Hobbit')).toHaveCount(0);
  expect(add.pictureUploadCount()).toBe(0);
});

test('Given Nia picks a file that is not a picture, then she is told to pick a JPEG, PNG or WebP and the preview keeps its sticker', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.chooseNotAPicture();

  await expect(add.pictureError()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP picture.');
  await expect(add.previewPicture()).toHaveCount(0);
});

test('Given Nia picks a picture over 5 MB, then she is told to pick a smaller one', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();

  await add.chooseTooLargePicture();

  await expect(add.pictureError()).toHaveText('That picture is too big. Pick one under 5 MB.');
  await expect(add.previewPicture()).toHaveCount(0);
});

test('Given the picture cannot upload, when Nia adds the book, then it is still on her shelf with its sticker and she is told', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.fill(HOBBIT);
  await add.choosePicture(coverFixture());
  await add.breakPictureUploads();

  await add.submit();

  const shelf = new ShelfPage(page);
  await expect(shelf.toast('The Hobbit is on your shelf, but its picture didn’t upload.')).toBeVisible();
  await expect(shelf.cover('Up next', 'The Hobbit')).toHaveText('🐉');
  await expect(shelf.coverPicture('Up next', 'The Hobbit')).toHaveCount(0);
});

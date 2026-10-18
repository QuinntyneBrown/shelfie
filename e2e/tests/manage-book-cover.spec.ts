// Traces to: L2-046, L2-048
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { coverFixture, uploadCoverViaApi } from '../support/covers';
import { ManageBookPage } from '../pages/manage-book.page';
import { ShelfPage } from '../pages/shelf.page';

const LION = 'The Lion, the Witch and the Wardrobe';

test('Given a book without a picture, when Dad adds one on Manage a book, then its cover shows the picture and he is told', async ({ page }) => {
  await signInAsDad(page);
  const manage = new ManageBookPage(page);
  await manage.open('b-lion');

  await manage.choosePicture(coverFixture('lion-cover.jpg'));

  await expect(manage.toast(`${LION} has a new cover.`)).toBeVisible();
  await expect(manage.coverPicture()).toBeVisible();
  await expect.poll(() => manage.coverPictureLoaded()).toBe(true);
  await expect(manage.removePictureButton()).toBeVisible();
  await page.context().clearCookies();
  await signInAsNia(page);
  await expect.poll(() => new ShelfPage(page).coverPictureLoaded('On the go', LION)).toBe(true);
});

test('Given a book with a picture, when Dad chooses another, then the new picture replaces it', async ({ page }) => {
  await signInAsDad(page);
  const first = await uploadCoverViaApi(page, 'b-lion');
  const manage = new ManageBookPage(page);
  await manage.open('b-lion');
  await expect(manage.coverPicture()).toHaveAttribute('src', first);

  await manage.choosePicture(coverFixture('lion-cover.jpg'));

  await expect(manage.coverPicture()).not.toHaveAttribute('src', first);
  await expect.poll(() => manage.coverPictureLoaded()).toBe(true);
});

test('Given a book with a picture, when Dad removes it, then the sticker comes back, focus stays on the chooser and it stays gone', async ({ page }) => {
  await signInAsDad(page);
  await uploadCoverViaApi(page, 'b-lion');
  const manage = new ManageBookPage(page);
  await manage.open('b-lion');

  await manage.removePicture();

  await expect(manage.coverPicture()).toHaveCount(0);
  await expect(manage.cover()).toHaveText('🦁');
  await expect(manage.removePictureButton()).toHaveCount(0);
  await expect(manage.pictureChooser()).toBeFocused();
  await page.reload();
  await expect(manage.cover()).toHaveText('🦁');
  await expect(manage.coverPicture()).toHaveCount(0);
});

test('Given Dad picks a file that is not a picture, then he is told to pick a JPEG, PNG or WebP and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const manage = new ManageBookPage(page);
  manage.watchPictureUploads();
  await manage.open('b-lion');

  await manage.chooseNotAPicture();

  await expect(manage.pictureError()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP picture.');
  expect(manage.pictureUploadCount()).toBe(0);
  await expect(manage.coverPicture()).toHaveCount(0);
});

test('Given Dad picks a picture over 5 MB, then he is told to pick a smaller one and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  const manage = new ManageBookPage(page);
  manage.watchPictureUploads();
  await manage.open('b-lion');

  await manage.chooseTooLargePicture();

  await expect(manage.pictureError()).toHaveText('That picture is too big. Pick one under 5 MB.');
  expect(manage.pictureUploadCount()).toBe(0);
});

test('Given a file that only claims to be a JPEG, when Dad picks it, then Shelfie refuses it with the same message and the cover stays', async ({ page }) => {
  await signInAsDad(page);
  const manage = new ManageBookPage(page);
  manage.watchPictureUploads();
  await manage.open('b-lion');

  await manage.chooseBrokenJpeg();

  await expect(manage.pictureError()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP picture.');
  expect(manage.pictureUploadCount()).toBe(1);
  await expect(manage.cover()).toHaveText('🦁');
});

test('Given a picture is uploading, then the chooser is busy and nothing else can be sent until it is done', async ({ page }) => {
  await signInAsDad(page);
  const manage = new ManageBookPage(page);
  await manage.open('b-lion');
  const release = await manage.holdPictureUploads();

  await manage.choosePicture(coverFixture());

  await expect(manage.pictureChooserButton()).toHaveAttribute('aria-busy', 'true');
  await expect(manage.pictureChooser()).toBeDisabled();
  release();
  await expect(manage.pictureChooserButton()).not.toHaveAttribute('aria-busy');
  await expect(manage.pictureChooser()).toBeEnabled();
  await expect(manage.coverPicture()).toBeVisible();
});

test('Given Shelfie cannot be reached, when Dad adds a picture, then the cover stays and he can try again once it is back', async ({ page }) => {
  await signInAsDad(page);
  const manage = new ManageBookPage(page);
  await manage.open('b-lion');
  await manage.breakPictureChanges();

  await manage.choosePicture(coverFixture());

  await expect(manage.pictureFailure()).toContainText('The picture didn’t upload');
  await expect(manage.coverPicture()).toHaveCount(0);
  await manage.repairPictureChanges();
  await manage.tryAgain();
  await expect(manage.coverPicture()).toBeVisible();
  await expect(manage.pictureFailure()).toHaveCount(0);
});

test('Given Shelfie cannot be reached, when Dad removes a picture, then it stays and he can try again once it is back', async ({ page }) => {
  await signInAsDad(page);
  await uploadCoverViaApi(page, 'b-lion');
  const manage = new ManageBookPage(page);
  await manage.open('b-lion');
  await manage.breakPictureChanges();

  await manage.removePicture();

  await expect(manage.pictureFailure()).toContainText('The picture wasn’t removed');
  await expect(manage.coverPicture()).toBeVisible();
  await manage.repairPictureChanges();
  await manage.tryAgain();
  await expect(manage.coverPicture()).toHaveCount(0);
  await expect(manage.cover()).toHaveText('🦁');
});

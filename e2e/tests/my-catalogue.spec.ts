// Traces to: L2-165, L2-166, L2-167, L2-176
import { test, expect } from '../support/test';
import { joinAsRosa, joinAsSam } from '../support/signed-in';
import { MyCataloguePage } from '../pages/my-catalogue.page';
import { CatalogueBookDialog } from '../pages/catalogue-book-dialog.page';
import { MyProfilePage } from '../pages/my-profile.page';
import { fixture } from '../pages/profile-photo-dialog.page';

const FOX = { title: 'The Lighthouse Fox', chapters: '12', description: 'A fox cub keeps the lighthouse lamp burning through the longest storm of winter.' };

test('Given Rosa’s empty catalogue, when she adds a book, then she is told it is in her catalogue and it is listed with its chapters and description', async ({ page }) => {
  await joinAsRosa(page);
  const catalogue = new MyCataloguePage(page);
  await catalogue.open();
  await expect(catalogue.emptyState()).toBeVisible();

  await catalogue.addBook();
  const dialog = new CatalogueBookDialog(page);
  await dialog.fill(FOX);
  await dialog.save();

  await expect(catalogue.toast('The Lighthouse Fox is in your catalogue')).toBeVisible();
  await expect(catalogue.titles()).toHaveText(['The Lighthouse Fox']);
  await expect(catalogue.book('The Lighthouse Fox')).toContainText(`12 chapters · ${FOX.description}`);
});

test('Given an empty title and no chapters, when Rosa adds the book, then the dialog says what to fix and nothing is sent', async ({ page }) => {
  await joinAsRosa(page);
  const catalogue = new MyCataloguePage(page);
  await catalogue.open();
  await catalogue.addBook();
  const dialog = new CatalogueBookDialog(page);
  await dialog.fill({ title: ' ', chapters: '0' });
  await dialog.save();

  await expect(dialog.problemSummary()).toContainText('Fix 2 things');
  await expect(dialog.chaptersField()).toHaveAccessibleDescription(/Enter a number from 1 to 200\./);
  expect(dialog.saveCount()).toBe(0);
});

test('Given a cover picture, when Rosa adds the book with it, then the preview shows it and so does her catalogue', async ({ page }) => {
  await joinAsRosa(page);
  const catalogue = new MyCataloguePage(page);
  await catalogue.open();
  await catalogue.addBook();
  const dialog = new CatalogueBookDialog(page);
  await dialog.fill(FOX);
  await dialog.choosePicture(fixture('lion-cover.jpg'));
  await expect(dialog.previewPicture()).toBeVisible();
  await dialog.save();

  await expect(catalogue.coverPicture('The Lighthouse Fox')).toHaveAttribute('src', /\/api\/catalogue-books\/[\w-]+\/cover\?v=/);
});

test('Given a picture that is too big or not a picture, when Rosa chooses it, then the dialog says so and keeps no picture', async ({ page }) => {
  await joinAsRosa(page);
  const catalogue = new MyCataloguePage(page);
  await catalogue.open();
  await catalogue.addBook();
  const dialog = new CatalogueBookDialog(page);

  await dialog.chooseTooLarge();
  await expect(dialog.pictureError()).toHaveText('That picture is too big. Pick one under 5 MB.');
  await dialog.chooseNotAPicture();
  await expect(dialog.pictureError()).toHaveText('Shelfie can’t use that file. Pick a JPEG, PNG or WebP picture.');
  await expect(dialog.previewPicture()).toHaveCount(0);
});

test('Given a book in Rosa’s catalogue, when she changes its chapters, then the catalogue shows the new count', async ({ page }) => {
  await joinAsRosa(page);
  const catalogue = new MyCataloguePage(page);
  await catalogue.open();
  await catalogue.addBook();
  const dialog = new CatalogueBookDialog(page);
  await dialog.fill(FOX);
  await dialog.save();
  await expect(catalogue.titles()).toHaveText(['The Lighthouse Fox']);

  await catalogue.edit('The Lighthouse Fox');
  await expect(dialog.titleField()).toHaveValue('The Lighthouse Fox');
  await dialog.fill({ chapters: '14' });
  await dialog.save();

  await expect(catalogue.book('The Lighthouse Fox')).toContainText('14 chapters');
});

test('Given a book in Rosa’s catalogue, when she removes it and confirms, then it leaves the catalogue; the confirmation starts on Keep it', async ({ page }) => {
  await joinAsRosa(page);
  const catalogue = new MyCataloguePage(page);
  await catalogue.open();
  await catalogue.addBook();
  const dialog = new CatalogueBookDialog(page);
  await dialog.fill(FOX);
  await dialog.save();
  await expect(catalogue.titles()).toHaveText(['The Lighthouse Fox']);

  await catalogue.remove('The Lighthouse Fox');
  await expect(catalogue.removeDialog()).toContainText('Families who already added it keep their copy.');
  await expect(catalogue.keepItButton()).toBeFocused();
  await catalogue.confirmRemove();

  await expect(catalogue.emptyState()).toBeVisible();
});

test('Given Sam, a volunteer, when he opens My catalogue by URL, then he is taken to My profile', async ({ page }) => {
  await joinAsSam(page);
  await new MyCataloguePage(page).open();

  await expect(page).toHaveURL(/\/me$/);
  await expect(new MyProfilePage(page).heading()).toHaveText('My profile');
});

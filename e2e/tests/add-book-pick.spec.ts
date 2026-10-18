// Traces to: L2-065, L2-066, L2-067
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { AddBookPage } from '../pages/add-book.page';
import { BookPage } from '../pages/book.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given Nia picks a catalogue match, then the title, author and cover fill in, chapters wait for her, and the book goes on her shelf with that cover', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  add.watchPictureUploads();
  await add.open();
  await add.typeTitle('Hobb');
  await expect(add.matches()).toHaveCount(1);

  await add.pickMatch('The Hobbit');

  await expect(add.matchList()).toHaveCount(0);
  await expect(add.titleField()).toHaveValue('The Hobbit');
  await expect(add.authorField()).toHaveValue('J. R. R. Tolkien');
  await expect(add.chaptersField()).toHaveValue('');
  await expect(add.chaptersField()).toBeFocused();
  await expect.poll(() => add.previewPictureLoaded()).toBe(true);
  await expect(add.removePictureButton()).toBeVisible();
  await expect(add.preview()).toContainText('The Hobbit');
  await expect(add.preview()).toContainText('J. R. R. Tolkien');
  expect(add.pictureUploadCount()).toBe(0);

  await add.chaptersField().fill('19');
  await add.submit();

  const shelf = new ShelfPage(page);
  await expect(shelf.toast('The Hobbit is on your shelf under Up next.')).toBeVisible();
  await expect(shelf.book('Up next', 'The Hobbit')).toContainText('J. R. R. Tolkien');
  await expect.poll(() => shelf.coverPictureLoaded('Up next', 'The Hobbit')).toBe(true);
  expect(add.pictureUploadCount()).toBe(1);
});

test('Given Nia picked a match, when she changes the title and author and removes the picture, then the book is saved as she left it', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.typeTitle('Winn');
  await add.pickMatch('Because of Winn-Dixie');
  await expect.poll(() => add.previewPictureLoaded()).toBe(true);

  await add.typeTitle('Opal’s Dog');
  await add.authorField().fill('Kate');
  await add.removePicture();
  await add.chaptersField().fill('26');
  await add.submit();

  const shelf = new ShelfPage(page);
  await expect(shelf.book('Up next', 'Opal’s Dog')).toContainText('Kate');
  await expect(shelf.coverPicture('Up next', 'Opal’s Dog')).toHaveCount(0);
});

test('Given a match without a cover, when picked, then the author fills in and the preview keeps the colour and sticker', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.typeTitle('Winn');

  await add.pickMatch('Winnie-the-Pooh');

  await expect(add.authorField()).toHaveValue('A. A. Milne');
  await expect(add.previewPicture()).toHaveCount(0);
  await expect(add.previewCover()).toHaveText('📚');
  await expect(add.removePictureButton()).toHaveCount(0);
});

test('Given the list is open, then nothing but the title changes until a match is picked; given the list is ignored, then the book is added by hand as before', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.typeTitle('Winn');
  await expect(add.matches()).toHaveCount(3);
  await expect(add.authorField()).toHaveValue('');
  await expect(add.chaptersField()).toHaveValue('');
  await expect(add.previewPicture()).toHaveCount(0);

  await add.pressInTitle('Escape');
  await add.fill({ title: 'Winn and the Wind', chapters: 4 });
  await add.submit();

  const shelf = new ShelfPage(page);
  await expect(shelf.book('Up next', 'Winn and the Wind')).toBeVisible();
  await expect(shelf.coverPicture('Up next', 'Winn and the Wind')).toHaveCount(0);
});

test('Given Nia picks a suggested match, then its author and chapter count fill in, there is no picture, and everything stays editable', async ({ page }) => {
  await signInAsNia(page);
  const add = new AddBookPage(page);
  await add.open();
  await add.typeTitle('Dragon Rider');
  await expect(add.matches()).toHaveCount(3);
  await expect(add.suggestedBadge('Dragon Rider')).toBeVisible();
  await expect(add.suggestedBadge('Dragon Rider: The Griffin’s Feather')).toBeVisible();

  await add.pickMatch('Dragon Rider: The Griffin’s Feather');

  await expect(add.titleField()).toHaveValue('Dragon Rider: The Griffin’s Feather');
  await expect(add.authorField()).toHaveValue('Cornelia Funke');
  await expect(add.chaptersField()).toHaveValue('40');
  await expect(add.previewPicture()).toHaveCount(0);
  await expect(add.preview()).toContainText('Cornelia Funke · 40 chapters');
  await add.chaptersField().fill('41');
  await add.submit();
  const shelf = new ShelfPage(page);
  await expect(shelf.book('Up next', 'Dragon Rider: The Griffin’s Feather')).toContainText('Cornelia Funke');
  await shelf.openBook('Up next', 'Dragon Rider: The Griffin’s Feather');
  await expect(new BookPage(page).chapterRow(41)).toBeAttached();
});

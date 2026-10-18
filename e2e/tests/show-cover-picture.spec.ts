// Traces to: L2-047
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { breakCoverPictures, uploadCoverViaApi } from '../support/covers';
import { BookPage } from '../pages/book.page';
import { BooksPage } from '../pages/books.page';
import { ChapterPage } from '../pages/chapter.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { ManageBookPage } from '../pages/manage-book.page';
import { ReviewChapterPage } from '../pages/review-chapter.page';
import { ReviewPage } from '../pages/review.page';
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

test('Given books with cover pictures, when Nia opens her book, logs a chapter and reads her answers, then each cover shows its picture', async ({ page }) => {
  await signInAsNia(page);
  const lion = await uploadCoverViaApi(page, 'b-lion');
  const book = new BookPage(page);
  const log = new LogChapterPage(page);
  const chapter = new ChapterPage(page);

  await book.open('b-lion');
  await expect(book.coverPicture()).toHaveAttribute('src', lion);
  await log.open('b-lion', 12);
  await expect(log.coverPicture()).toHaveAttribute('src', lion);
  await chapter.open('b-lion-c9');
  await expect(chapter.coverPicture()).toHaveAttribute('src', lion);
});

test('Given a finished book with a cover picture, when Nia sees it celebrated and on her trophy shelf, then its cover shows the picture', async ({ page }) => {
  await signInAsNia(page);
  const bfg = await uploadCoverViaApi(page, 'b-bfg');
  const web = await uploadCoverViaApi(page, 'b-web');
  const log = new LogChapterPage(page);
  await log.open('b-bfg', 3);

  await log.answer(1, 'The giant blew dreams into bedrooms.');
  await log.done();

  await expect(log.finishedHeading()).toBeVisible();
  await expect(log.coverPicture()).toHaveAttribute('src', bfg);
  await log.backToShelf();
  await expect(new ShelfPage(page).finishedCoverPicture('Charlotte’s Web')).toHaveAttribute('src', web);
});

test('Given books with cover pictures, when Dad reviews, gives a reward and manages his books, then each cover shows its picture', async ({ page }) => {
  await signInAsDad(page);
  const lion = await uploadCoverViaApi(page, 'b-lion');
  const matilda = await uploadCoverViaApi(page, 'b-matilda');
  const review = new ReviewPage(page);
  const reviewChapter = new ReviewChapterPage(page);
  const books = new BooksPage(page);
  const manage = new ManageBookPage(page);

  await review.open();
  await expect(review.queueCoverPicture(11)).toHaveAttribute('src', lion);
  await expect(review.rewardCardCoverPicture('Matilda')).toHaveAttribute('src', matilda);
  await review.openGiveReward('Matilda');
  await expect(review.rewardDialogCoverPicture()).toHaveAttribute('src', matilda);
  await reviewChapter.open('b-lion-c11');
  await expect(reviewChapter.coverPicture()).toHaveAttribute('src', lion);
  await books.open();
  await expect(books.coverPicture(LION)).toHaveAttribute('src', lion);
  await manage.open('b-lion');
  await manage.openRemoveDialog();
  await expect(manage.removeDialogCoverPicture()).toHaveAttribute('src', lion);
});

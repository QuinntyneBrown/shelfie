import { test } from '../../../../tools/video-record/test';
import { signInAsNia } from '../../../../e2e/support/signed-in';
import { rememberDevice } from '../../../../e2e/support/remember-device';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { BookPage } from '../../../../e2e/pages/book.page';
import { ChapterPage } from '../../../../e2e/pages/chapter.page';
import { ReviewChapterPage } from '../../../../e2e/pages/review-chapter.page';

const LION = 'The Lion, the Witch and the Wardrobe';

// Paced to the narration in script.md: chapter 10 waiting for Dad, her answers, on to 11, back to the book.
test('read-back-answers', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openBook('On the go', LION);
  const book = new BookPage(page);
  await book.chapterRow(10).hover();
  await page.waitForTimeout(1500);
  await book.openChapterRow(10);

  const chapter = new ChapterPage(page);
  await chapter.whenRead().hover();
  await page.waitForTimeout(6000);
  await chapter.waitingCard().hover();
  await page.waitForTimeout(8000);
  await chapter.answer(1).hover();
  await page.waitForTimeout(9000);
  await chapter.nextChapterLink(11).hover();
  await page.waitForTimeout(1500);
  await chapter.nextChapterLink(11).click();
  await page.waitForTimeout(4000);
  await chapter.backToBook();
  await book.heading().waitFor();
  await page.waitForTimeout(4000);
});

// Paced to the narration: Dad has sent a Wise owl for chapter 11 (off screen); Nia sees the banner and opens it.
test('see-dads-feedback', async ({ page }) => {
  await rememberDevice(page.context());
  await new ReviewChapterPage(page).sendViaApi('b-lion-c11', { sticker: 'wise-owl', note: 'Brilliant, Nia!' });
  await page.context().clearCookies();

  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await shelf.feedbackBanner().hover();
  await page.waitForTimeout(7000);
  await shelf.openFeedback(11);
  await new ChapterPage(page).feedback().hover();
  await page.waitForTimeout(9000);
});

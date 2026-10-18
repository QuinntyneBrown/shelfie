// Traces to: L2-016
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ChapterPage } from '../pages/chapter.page';
import { ReviewChapterPage } from '../pages/review-chapter.page';
import { ShelfPage } from '../pages/shelf.page';

async function dadReviewsChapter11(page: import('@playwright/test').Page) {
  await signInAsDad(page);
  const sent = await new ReviewChapterPage(page).sendViaApi('b-lion-c11', { sticker: 'wise-owl', note: 'Brilliant, Nia!' });
  expect(sent.ok()).toBe(true);
  await page.context().clearCookies();
}

test('Given Dad reviewed a chapter, when Nia opens her shelf, then a banner announces it and links to the chapter, and goes once she has opened it', async ({ page }) => {
  await dadReviewsChapter11(page);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await expect(shelf.feedbackBanner()).toContainText('Dad read Chapter 11 and gave you a Wise owl');
  await shelf.openFeedback(11);
  const chapter = new ChapterPage(page);
  await expect(chapter.feedback()).toContainText('Dad gave you a Wise owl');
  await expect(chapter.feedback()).toContainText('Brilliant, Nia!');

  await page.goto('/shelf');
  await expect(shelf.greeting()).toHaveText('Hi Nia');
  await expect(shelf.feedbackBanner()).toHaveCount(0);
});

test('Given a feedback banner, when Nia dismisses it, then it goes for now but comes back until she opens the chapter', async ({ page }) => {
  await dadReviewsChapter11(page);
  await signInAsNia(page);
  const shelf = new ShelfPage(page);

  await shelf.dismissFeedback();
  await expect(shelf.feedbackBanner()).toHaveCount(0);
  await page.reload();
  await expect(shelf.feedbackBanner()).toBeVisible();
});

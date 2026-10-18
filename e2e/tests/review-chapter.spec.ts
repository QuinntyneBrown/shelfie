// Traces to: L2-015
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { ReviewPage } from '../pages/review.page';
import { ReviewChapterPage } from '../pages/review-chapter.page';
import { ShellPage } from '../pages/shell.page';

test('Given a chapter waiting, when Dad picks a sticker, adds a note and sends, then it is reviewed and the next chapter is offered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAsDad(page);
  await new ReviewPage(page).review(11);

  const chapter = new ReviewChapterPage(page);
  await expect(chapter.heading()).toHaveText('Chapter 11');
  await expect(chapter.answers().nth(0)).toContainText('Father Christmas gave them presents.');
  await expect(chapter.stickers()).toHaveCount(6);
  await chapter.pickSticker('Wise owl');
  await chapter.noteField().fill('Lovely answer, Nia.');
  await chapter.send();

  await expect(chapter.sentHeading()).toBeVisible();
  await expect(page.getByText('She’ll see your Wise owl and note the next time she opens Shelfie.')).toBeVisible();
  await expect(new ShellPage(page).queueBadge('top')).toHaveAccessibleName('1 chapter to review');
  await chapter.reviewNext(10);
  await expect(chapter.heading()).toHaveText('Chapter 10');
});

test('Given no sticker is picked, when Dad presses Send, then he is asked to pick one and nothing is sent', async ({ page }) => {
  await signInAsDad(page);
  await new ReviewPage(page).review(11);
  const chapter = new ReviewChapterPage(page);
  chapter.watchSends();
  await chapter.noteField().fill('Nice.');
  await chapter.send();

  await expect(chapter.stickerError()).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('One more thing');
  expect(chapter.sendCount()).toBe(0);
});

test('Given a note longer than 300 characters, when Dad keeps typing, then it stops at 300', async ({ page }) => {
  await signInAsDad(page);
  await new ReviewPage(page).review(11);
  const chapter = new ReviewChapterPage(page);
  await chapter.noteField().fill('n'.repeat(290));
  await chapter.noteField().pressSequentially('x'.repeat(20));

  expect((await chapter.noteField().inputValue()).length).toBe(300);
});

test('Given a chapter Dad already reviewed, when he opens it, then his feedback shows read-only and it cannot be sent again', async ({ page }) => {
  await signInAsDad(page);
  await page.goto('/review/chapters/b-lion-c9');
  const chapter = new ReviewChapterPage(page);

  await expect(chapter.sentFeedback()).toContainText('You gave a Star');
  await expect(chapter.sentFeedback()).toContainText('Lovely work!');
  await expect(chapter.stickers()).toHaveCount(0);
  const again = await chapter.sendViaApi('b-lion-c9', { sticker: 'rocket' });
  expect([again.status(), (await again.json()).type]).toEqual([409, 'already-reviewed']);
});

test('Given a request that skips the page, when Nia sends feedback or Dad targets another family’s chapter, then the API refuses it', async ({ page }) => {
  await signInAsNia(page);
  const chapter = new ReviewChapterPage(page);
  expect((await chapter.sendViaApi('b-lion-c11', { sticker: 'star' })).status()).toBe(403);

  await page.context().clearCookies();
  await signInAsDad(page);
  expect((await chapter.sendViaApi('b-other-c1', { sticker: 'star' })).status()).toBe(404);
  expect((await chapter.sendViaApi('b-lion-c11', { sticker: 'glitter' })).status()).toBe(400);
});

test('Given Dad opens a chapter on a phone, when the page shows, then the breadcrumb sits clear of the top bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsDad(page);
  await new ReviewPage(page).review(11);
  const chapter = new ReviewChapterPage(page);
  await expect(chapter.heading()).toHaveText('Chapter 11');

  expect(await chapter.breadcrumbGapBelowTopBar()).toBeGreaterThanOrEqual(16);
});

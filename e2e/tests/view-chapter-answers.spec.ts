// Traces to: L2-012
import { test, expect } from '../support/test';
import { signInAsNia } from '../support/signed-in';
import { BookPage } from '../pages/book.page';
import { ChapterPage } from '../pages/chapter.page';
import { ErrorPage } from '../pages/error.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { ShelfPage } from '../pages/shelf.page';

const LION = 'The Lion, the Witch and the Wardrobe';

test('Given a logged chapter waiting for review, when Nia opens it from the book page, then she sees her answers read-only and that Dad has not read it yet', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openBook('On the go', LION);
  await new BookPage(page).openChapterRow(10);

  const chapter = new ChapterPage(page);
  await expect(chapter.heading()).toHaveText('Chapter 10');
  await expect(chapter.whenRead()).toContainText('you read it on Thu 15 Oct');
  await expect(chapter.waitingCard()).toContainText('When he does, his sticker and note will show up here.');
  await expect(chapter.answer(1)).toContainText('What happened in this chapter?');
  await expect(chapter.answer(1)).toContainText('Aslan came back and the snow started to melt.');
  await expect(page.getByRole('textbox')).toHaveCount(0);

  await chapter.nextChapterLink(11).click();
  await expect(chapter.heading()).toHaveText('Chapter 11');
  await expect(chapter.nextChapterLink(12)).toHaveCount(0);
  await chapter.backToBook();
  await expect(new BookPage(page).heading()).toHaveText(LION);
});

test('Given Nia left the optional answers blank, when she opens the chapter, then those questions show with nothing under them', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);
  await log.answer(1, 'They had a feast.');
  await log.done();
  await expect(log.heading()).toHaveText('Chapter 12 done!');

  await page.goto('/book/b-lion');
  await new BookPage(page).openChapterRow(12);

  const chapter = new ChapterPage(page);
  await expect(chapter.answers()).toHaveCount(3);
  await expect(chapter.answer(2)).toHaveText(/^\s*2\.\s*Who was your favourite character in this chapter, and why\?\s*$/);
});

test('Given another family’s chapter, when Nia opens it, then she sees Not found', async ({ page }) => {
  await signInAsNia(page);
  await page.goto('/chapter-logs/b-other-c1');

  await expect(new ErrorPage(page).heading()).toHaveText('We can’t find that page');
});

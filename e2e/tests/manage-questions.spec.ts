// Traces to: L2-013
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { questionsAnswered, householdDay } from '../support/database';
import { BooksPage } from '../pages/books.page';
import { ManageBookPage } from '../pages/manage-book.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { ShelfPage } from '../pages/shelf.page';

const LION = 'The Lion, the Witch and the Wardrobe';
const DEFAULTS = [
  'What happened in this chapter?',
  'Who was your favourite character in this chapter, and why?',
  'What do you think will happen next?',
];
const CUSTOM = 'Where did the children go in this chapter?';

async function manageLion(page: import('@playwright/test').Page) {
  await signInAsDad(page);
  const books = new BooksPage(page);
  await books.open();
  await books.manage(LION);
  return new ManageBookPage(page);
}

async function logLionChapter(page: import('@playwright/test').Page, chapter: number) {
  await page.context().clearCookies();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, chapter);
  const log = new LogChapterPage(page);
  await log.answer(1, 'Something happened.');
  await log.done();
  await expect(log.heading()).toHaveText(`Chapter ${chapter} done!`);
}

test('Given Manage book, then the three default questions are listed in order with nothing to edit or remove', async ({ page }) => {
  const manage = await manageLion(page);

  await expect(manage.questions()).toHaveCount(3);
  for (const [i, text] of DEFAULTS.entries()) {
    await expect(manage.questions().nth(i)).toContainText(text);
    await expect(manage.questions().nth(i)).toContainText('Default question');
    await expect(manage.questions().nth(i).getByRole('button')).toHaveCount(0);
  }
});

test('Given Dad adds a question, then it follows the defaults and Nia answers it for her next chapter', async ({ page }) => {
  const manage = await manageLion(page);
  await manage.addQuestion(CUSTOM);

  await expect(manage.questions()).toHaveCount(4);
  await expect(manage.questions().nth(3)).toContainText(CUSTOM);

  await logLionChapter(page, 12);
  expect(questionsAnswered('b-lion', 12)).toEqual([...DEFAULTS, CUSTOM]);
});

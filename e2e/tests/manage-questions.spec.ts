// Traces to: L2-013
import { test, expect } from '../support/test';
import { SAME_SITE } from '../support/same-site';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { questionsAnswered } from '../support/database';
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

for (const text of ['What', 'x'.repeat(201)]) {
  test(`Given a question of ${text.length} characters, when Dad saves it, then an inline error shows and nothing is saved`, async ({ page }) => {
    const manage = await manageLion(page);
    manage.watchQuestionWrites();
    await manage.addQuestion(text);

    await expect(manage.questionField()).toHaveAccessibleDescription(/Finish the question — at least a few words, ending in a question mark helps\./);
    await expect(manage.questions()).toHaveCount(3);
    expect(manage.questionWriteCount()).toBe(0);
  });
}

test('Given a custom question, when Dad edits it, then later chapters ask the new wording and earlier answers keep the old', async ({ page }) => {
  const manage = await manageLion(page);
  await manage.addQuestion(CUSTOM);
  await logLionChapter(page, 12);

  await page.context().clearCookies();
  const again = await manageLion(page);
  await again.editQuestion(CUSTOM, 'Where did they go next?');
  await expect(again.question('Where did they go next?')).toBeVisible();
  await logLionChapter(page, 13);

  expect(questionsAnswered('b-lion', 12)).toEqual([...DEFAULTS, CUSTOM]);
  expect(questionsAnswered('b-lion', 13)).toEqual([...DEFAULTS, 'Where did they go next?']);
});

test('Given a custom question, when Dad removes it, then later chapters stop asking it and earlier answers keep it', async ({ page }) => {
  const manage = await manageLion(page);
  await manage.addQuestion(CUSTOM);
  await logLionChapter(page, 12);

  await page.context().clearCookies();
  const again = await manageLion(page);
  await again.removeQuestion(CUSTOM);
  await expect(again.questions()).toHaveCount(3);
  await logLionChapter(page, 13);

  expect(questionsAnswered('b-lion', 12)).toEqual([...DEFAULTS, CUSTOM]);
  expect(questionsAnswered('b-lion', 13)).toEqual(DEFAULTS);
});

test('Given saving fails, when Dad adds a question, then the dialog says so and keeps his wording', async ({ page }) => {
  const manage = await manageLion(page);
  await manage.breakQuestionSaving();
  await manage.addQuestion(CUSTOM);

  await expect(manage.questionDialog()).toContainText('The question wasn’t saved');
  await expect(manage.questionField()).toHaveValue(CUSTOM);
});

test('Given a request that skips the page, when Nia writes a question or Dad targets another family’s book, then the API refuses it', async ({ page }) => {
  await signInAsNia(page);
  expect((await page.request.post('/api/books/b-lion/questions', { ...SAME_SITE, data: { text: CUSTOM } })).status()).toBe(403);

  await page.context().clearCookies();
  await signInAsDad(page);
  expect((await page.request.post('/api/books/b-other/questions', { ...SAME_SITE, data: { text: CUSTOM } })).status()).toBe(404);
  expect((await page.request.patch('/api/questions/no-such-question', { ...SAME_SITE, data: { text: CUSTOM } })).status()).toBe(404);
  expect((await page.request.delete('/api/questions/no-such-question', SAME_SITE)).status()).toBe(404);
});

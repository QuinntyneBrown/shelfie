// Traces to: L2-064, L2-065, L2-066, L2-068
import { test, expect } from '../support/test';
import { SAME_SITE } from '../support/same-site';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { questionsAnswered } from '../support/database';
import { IDEAS } from '../support/suggestions';
import { BooksPage } from '../pages/books.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { ManageBookPage } from '../pages/manage-book.page';
import { ShelfPage } from '../pages/shelf.page';
import { SuggestQuestionsDialog } from '../pages/suggest-questions-dialog.page';

const LION = 'The Lion, the Witch and the Wardrobe';
const DEFAULTS = [
  'What happened in this chapter?',
  'Who was your favourite character in this chapter, and why?',
  'What do you think will happen next?',
];

async function suggestForLion(page: import('@playwright/test').Page) {
  await signInAsDad(page);
  const books = new BooksPage(page);
  await books.open();
  await books.manage(LION);
  const manage = new ManageBookPage(page);
  await manage.suggestQuestions();
  return { manage, dialog: new SuggestQuestionsDialog(page) };
}

test('Given Manage book, when Dad asks for suggested questions, then the ideas are listed unticked and editable with nothing to add yet', async ({ page }) => {
  const { dialog } = await suggestForLion(page);

  await expect(dialog.suggestions()).toHaveCount(5);
  for (const [i, idea] of IDEAS.entries()) {
    await expect(dialog.wording(i + 1)).toHaveValue(idea);
    await expect(dialog.keepBox(i + 1)).not.toBeChecked();
  }
  await expect(dialog.addButton()).toBeDisabled();
  await expect(dialog.dialog()).toContainText('Tick at least one question to add it.');
});

test('Given Nia, when she asks for suggestions without the page, then the API refuses her', async ({ page }) => {
  await signInAsNia(page);
  expect((await page.request.post('/api/books/b-lion/question-suggestions', SAME_SITE)).status()).toBe(403);
});

test('Given suggestions, when Dad ticks two, rewords one and adds them, then they join the list and Nia answers them for her next chapter', async ({ page }) => {
  const { manage, dialog } = await suggestForLion(page);
  await dialog.keep(2, 4);
  await dialog.reword(2, 'How did Edmund feel when he got to the Witch’s house?');
  await expect(dialog.addButton()).toHaveText('Add 2 questions');

  await dialog.add();

  await expect(dialog.dialog()).toBeHidden();
  await expect(manage.toast('2 questions added')).toBeVisible();
  await expect(manage.toast('Nia answers them from chapter 12.')).toBeVisible();
  await expect(manage.questions()).toHaveCount(5);
  await expect(manage.questions().nth(3)).toContainText('How did Edmund feel when he got to the Witch’s house?');
  await expect(manage.questions().nth(3)).toContainText('Added by you');
  await expect(manage.questions().nth(4)).toContainText(IDEAS[3]);

  await page.context().clearCookies();
  await signInAsNia(page);
  await new ShelfPage(page).logChapter('On the go', LION, 12);
  const log = new LogChapterPage(page);
  await log.answer(1, 'Edmund was scared.');
  await log.done();
  await expect(log.heading()).toHaveText('Chapter 12 done!');
  expect(await questionsAnswered('b-lion', 12)).toEqual([...DEFAULTS, 'How did Edmund feel when he got to the Witch’s house?', IDEAS[3]]);
});

test('Given a ticked suggestion cut down to one word, when Dad adds, then that row says so, takes focus and nothing is saved', async ({ page }) => {
  const { manage, dialog } = await suggestForLion(page);
  await dialog.keep(1, 3);
  await dialog.reword(3, 'Why?');
  manage.watchQuestionWrites();

  await dialog.add();

  await expect(dialog.wording(3)).toHaveAccessibleDescription(/Finish the question — at least a few words, ending in a question mark helps\./);
  await expect(dialog.wording(3)).toBeFocused();
  expect(manage.questionWriteCount()).toBe(0);
  await expect(manage.questions()).toHaveCount(3);
});

test('Given adding fails part-way, then the saved question stays, the rest stay ticked under a banner, and adding again finishes', async ({ page }) => {
  const { manage, dialog } = await suggestForLion(page);
  await dialog.keep(1, 2);
  await dialog.breakAddingAfter(1);

  await dialog.add();

  await expect(dialog.failure()).toContainText('The questions weren’t all added');
  await expect(manage.questions()).toHaveCount(4);
  await expect(dialog.suggestions()).toHaveCount(4);
  await expect(dialog.wording(1)).toHaveValue(IDEAS[1]);
  await expect(dialog.keepBox(1)).toBeChecked();

  await dialog.repairAdding();
  await dialog.add();

  await expect(dialog.dialog()).toBeHidden();
  await expect(manage.toast('1 question added')).toBeVisible();
  await expect(manage.questions()).toHaveCount(5);
});

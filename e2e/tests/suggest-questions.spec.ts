// Traces to: L2-064, L2-065, L2-066, L2-068
import { test, expect } from '../support/test';
import { SAME_SITE } from '../support/same-site';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { IDEAS } from '../support/suggestions';
import { BooksPage } from '../pages/books.page';
import { ManageBookPage } from '../pages/manage-book.page';
import { SuggestQuestionsDialog } from '../pages/suggest-questions-dialog.page';

const LION = 'The Lion, the Witch and the Wardrobe';

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

import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { BooksPage } from '../../../../e2e/pages/books.page';
import { ManageBookPage } from '../../../../e2e/pages/manage-book.page';

const LION = 'The Lion, the Witch and the Wardrobe';
const CUSTOM = 'Where did the children go in this chapter?';

// Paced to the narration in script.md: Manage the Lion, read the defaults, add a question, see it listed.
test('manage-questions', async ({ page }) => {
  await signInAsDad(page);
  await page.waitForTimeout(3000);
  await new ShellPage(page).navLink('top', 'Books').click();
  const books = new BooksPage(page);
  await books.row(LION).hover();
  await page.waitForTimeout(2000);
  await books.manage(LION);

  const manage = new ManageBookPage(page);
  await manage.heading().waitFor();
  await page.waitForTimeout(2000);
  await manage.questions().first().hover();
  await page.waitForTimeout(6000);
  await manage.questions().nth(2).hover();
  await page.waitForTimeout(8000);

  await manage.openAddQuestion();
  await manage.questionField().waitFor();
  await page.waitForTimeout(1000);
  await manage.questionField().pressSequentially(CUSTOM, { delay: 100 });
  await page.waitForTimeout(6000);

  await manage.confirmAddQuestion();
  await manage.question(CUSTOM).hover();
  await page.waitForTimeout(10000);
});

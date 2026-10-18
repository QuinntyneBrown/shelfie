import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { BooksPage } from '../../../../e2e/pages/books.page';
import { ManageBookPage } from '../../../../e2e/pages/manage-book.page';

const LION = 'The Lion, the Witch and the Wardrobe';
const WINN = 'Because of Winn-Dixie';

// Paced to "Editing a book": Books list, fix Winn-Dixie's chapter count, then the Lion's chapters and the count guard.
test('edit-a-book', async ({ page }) => {
  await signInAsDad(page);
  const shell = new ShellPage(page);
  const books = new BooksPage(page);
  const manage = new ManageBookPage(page);
  await page.waitForTimeout(1500);
  await shell.navLink('top', 'Books').hover();
  await shell.navLink('top', 'Books').click();
  await page.waitForTimeout(5000);

  await books.manage(WINN);
  await page.waitForTimeout(2500);
  await manage.chapters().fill('');
  await manage.chapters().pressSequentially('26', { delay: 300 });
  await page.waitForTimeout(1500);
  await manage.save();
  await manage.saved().waitFor();
  await page.waitForTimeout(4000);

  await shell.navLink('top', 'Books').click();
  await books.manage(LION);
  await page.waitForTimeout(2000);
  await manage.loggedChapters().hover();
  await page.waitForTimeout(6000);
  await manage.chapters().fill('');
  await manage.chapters().pressSequentially('10', { delay: 300 });
  await manage.save();
  await page.waitForTimeout(6000);
});

// Paced to "Removing a book": Remove book, the dialog with Keep the book focused, then confirm and the toast.
test('remove-a-book', async ({ page }) => {
  await signInAsDad(page);
  const books = new BooksPage(page);
  const manage = new ManageBookPage(page);
  await books.open();
  await books.manage(WINN);
  await page.waitForTimeout(1500);
  await manage.removeButton().hover();
  await page.waitForTimeout(1500);
  await manage.openRemoveDialog();
  await manage.keepButton().waitFor();
  await page.waitForTimeout(5000);
  await manage.confirmRemove();
  await page.waitForURL(/\/books$/);
  await page.waitForTimeout(5000);
});

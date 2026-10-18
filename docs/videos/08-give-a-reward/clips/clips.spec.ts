import { test } from '../../../../tools/video-record/test';
import { signInAsDad } from '../../../../e2e/support/signed-in';
import { ReviewPage } from '../../../../e2e/pages/review.page';
import { ShellPage } from '../../../../e2e/pages/shell.page';
import { SignInPage } from '../../../../e2e/pages/sign-in.page';
import { ShelfPage } from '../../../../e2e/pages/shelf.page';
import { BookPage } from '../../../../e2e/pages/book.page';

// Paced to the narration in script.md: the Matilda card, the dialog and quick picks, Give the reward,
// then Switch reader to Nia, her Finished books and the book's trophy card.
test('give-a-reward', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.rewardCard('Matilda').scrollIntoViewIfNeeded();
  await review.rewardCard('Matilda').hover();
  await page.waitForTimeout(4000);
  await review.openGiveReward('Matilda');
  await page.waitForTimeout(7000);
  await review.quickPick('Ice cream Saturday').hover();
  await page.waitForTimeout(2000);
  await review.quickPick('Trip to the bookshop').hover();
  await page.waitForTimeout(2000);
  await review.quickPick('Movie night').click();
  await page.waitForTimeout(4000);
  await review.giveReward();
  await page.waitForTimeout(9000);

  const shell = new ShellPage(page);
  await shell.openAccountMenu('Dad');
  await shell.menuItem('Switch reader').click();
  const signIn = new SignInPage(page);
  await signIn.choose('Nia');
  await signIn.enterPin('1234');
  const shelf = new ShelfPage(page);
  await shelf.finishedBook('Matilda').scrollIntoViewIfNeeded();
  await shelf.finishedBook('Matilda').hover();
  await page.waitForTimeout(7000);
  await shelf.openFinishedBook('Matilda');
  await new BookPage(page).trophy().hover();
  await page.waitForTimeout(9000);
});

// Traces to: L2-002, L2-009, L2-011, L2-015, L2-016, L2-017, L2-018, L2-019
import { test, expect } from '../support/test';
import { DAD, NIA } from '../support/accounts';
import { SignInPage } from '../pages/sign-in.page';
import { ShellPage } from '../pages/shell.page';
import { AddBookPage } from '../pages/add-book.page';
import { BooksPage } from '../pages/books.page';
import { ShelfPage } from '../pages/shelf.page';
import { LogChapterPage } from '../pages/log-chapter.page';
import { ReviewPage } from '../pages/review.page';
import { ReviewChapterPage } from '../pages/review-chapter.page';

test('Given a fresh browser, when Dad adds a book, Nia reads it, Dad reviews and rewards it, then Nia sees it all', async ({ page }) => {
  const signIn = new SignInPage(page);
  const shell = new ShellPage(page);
  await signIn.open();
  await signIn.signInWithPassword(DAD.username, DAD.password);
  await page.setViewportSize({ width: 1280, height: 900 });
  await shell.topNav().getByRole('link', { name: 'Books' }).click();
  await new BooksPage(page).addBookLink().click();
  const add = new AddBookPage(page);
  await add.fill({ title: 'Fantastic Mr Fox', author: 'Roald Dahl', chapters: 2, colour: 'Peach', sticker: 'Rabbit' });
  await add.submit();

  await shell.openAccountMenu('Dad');
  await shell.menuItem('Sign out').click();
  await signIn.signInWithPassword(NIA.username, NIA.password);
  const shelf = new ShelfPage(page);
  const log = new LogChapterPage(page);
  await shelf.logChapter('Up next', 'Fantastic Mr Fox', 1);
  await log.answer(1, 'Mr Fox stole chickens from the three farmers.');
  await log.done();
  await expect(log.heading()).toHaveText('Chapter 1 done!');
  await page.getByRole('link', { name: 'I read Chapter 2 too' }).click();
  await log.answer(1, 'The farmers dug and dug.');
  await log.done();
  await expect(log.finishedHeading()).toBeVisible();

  await shell.openAccountMenu('Nia');
  await shell.menuItem('Sign out').click();
  await signIn.signInWithPassword(DAD.username, DAD.password);
  const review = new ReviewPage(page);
  await review.queue().filter({ hasText: 'Chapter 2 · Fantastic Mr Fox' }).getByRole('link', { name: 'Review' }).click();
  const chapter = new ReviewChapterPage(page);
  await chapter.pickSticker('Rocket');
  await chapter.noteField().fill('What a clever fox!');
  await chapter.send();
  await expect(chapter.sentHeading()).toBeVisible();
  await page.getByRole('link', { name: 'Back to Review' }).first().click();
  await review.openGiveReward('Fantastic Mr Fox');
  await review.quickPick('Trip to the bookshop').click();
  await review.giveReward();
  await expect(page.getByRole('status').getByText('Reward given!')).toBeVisible();

  await shell.openAccountMenu('Dad');
  await shell.menuItem('Sign out').click();
  await signIn.signInWithPassword(NIA.username, NIA.password);
  await expect(shelf.feedbackBanner().filter({ hasText: 'Chapter 2' })).toContainText('gave you a Rocket');
  await expect(shelf.finishedBook('Fantastic Mr Fox')).toContainText('Trip to the bookshop');
});

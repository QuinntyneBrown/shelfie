// Traces to: L2-137, L2-138, L2-139, L2-140, L2-141, L2-142
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia, signInAsTheo } from '../support/signed-in';
import { addTheo, finishBook } from '../support/database';
import { AddBookPage } from '../pages/add-book.page';
import { BooksPage } from '../pages/books.page';
import { ManageBookPage } from '../pages/manage-book.page';
import { ReviewChapterPage } from '../pages/review-chapter.page';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';
import { ShellPage } from '../pages/shell.page';

test.describe('with two readers', () => {
  test.beforeEach(async () => {
    await addTheo();
  });

  test('Given Nia and Theo, when each signs in, then each shelf shows only her own books and her own streak', async ({ page }) => {
    await signInAsTheo(page);
    const shelf = new ShelfPage(page);

    await expect(shelf.greeting()).toContainText('Hi Theo');
    await expect(shelf.book('On the go', 'Dinosaurs Before Dark')).toBeVisible();
    expect(await shelf.bookTitles()).toEqual(['Dinosaurs Before Dark']);
    await expect(shelf.summary()).toContainText('1-day streak');

    await page.context().clearCookies();
    await signInAsNia(page);
    await expect(shelf.book('On the go', 'The Lion, the Witch and the Wardrobe')).toBeVisible();
    expect(await shelf.bookTitles()).not.toContain('Dinosaurs Before Dark');
  });

  test('Given two readers, when Dad opens Review and picks Theo, then the page is all Theo’s, and Books remembers him', async ({ page }) => {
    await signInAsDad(page);
    const review = new ReviewPage(page);

    await expect(review.readerChoice('Nia')).toHaveText('Nia · 2');
    await expect(review.readerChoice('Theo')).toHaveText('Theo · 1');
    await expect(review.readerChoice('Nia')).toHaveAttribute('aria-pressed', 'true');
    await expect(new ShellPage(page).queueBadge('top')).toHaveText('3');
    await expect(review.queue()).toHaveCount(2);

    await review.pickReader('Theo');

    await expect(review.queue()).toHaveCount(1);
    await expect(review.queue().first()).toContainText('Chapter 4 · Dinosaurs Before Dark');
    await expect(review.queue().first()).toContainText('Theo read it');
    await expect(review.readersBadges('Theo')).toBeVisible();

    const books = new BooksPage(page);
    await books.open();
    await expect(books.readerChoice('Theo')).toHaveAttribute('aria-pressed', 'true');
    await expect(books.row('Dinosaurs Before Dark')).toBeVisible();
    await expect(books.row('The Lion, the Witch and the Wardrobe')).toHaveCount(0);
  });

  test('Given two readers, when Dad adds a book for Theo, then it lands on Theo’s shelf only', async ({ page }) => {
    await signInAsDad(page);
    const addBook = new AddBookPage(page);
    await addBook.open();

    await expect(addBook.readerPicker()).toBeVisible();
    await addBook.pickReader('Theo');
    await addBook.fill({
      title: 'Frog and Toad Are Friends',
      author: 'Arnold Lobel',
      chapters: 5,
    });
    await expect(addBook.submitButton()).toHaveText(/Add to Theo’s shelf/);
    await addBook.submit();
    await page.waitForURL('**/shelf');

    await page.context().clearCookies();
    await signInAsTheo(page);
    await expect(new ShelfPage(page).book('Up next', 'Frog and Toad Are Friends')).toBeVisible();
  });

  test('Given Theo’s book, then Manage book, Review a chapter and Give a reward name Theo', async ({ page }) => {
    await finishBook('b-dino');
    await signInAsDad(page);

    const manage = new ManageBookPage(page);
    await manage.open('b-dino');
    await expect(manage.readerLabel()).toHaveText('Theo’s book');

    const chapter = new ReviewChapterPage(page);
    await chapter.open('b-dino-c4');
    await expect(chapter.readerLabel()).toHaveText('Theo’s chapter');

    const review = new ReviewPage(page);
    await review.open();
    await review.pickReader('Theo');
    await review.openGiveReward('Dinosaurs Before Dark');
    await expect(review.rewardDialog()).toContainText('Theo will see it');
  });
});

test('Given one reader, then no reader picker or reader label shows anywhere', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);

  await expect(review.queue()).toHaveCount(2);
  await expect(review.readerPicker()).toHaveCount(0);
  const books = new BooksPage(page);
  await books.open();
  await expect(books.row('Matilda')).toBeVisible();
  await expect(books.readerPicker()).toHaveCount(0);
  const addBook = new AddBookPage(page);
  await addBook.open();
  await expect(addBook.titleField()).toBeVisible();
  await expect(addBook.readerPicker()).toHaveCount(0);
  const manage = new ManageBookPage(page);
  await manage.open('b-lion');
  await expect(manage.heading()).toBeVisible();
  await expect(manage.readerLabel()).toHaveCount(0);
});

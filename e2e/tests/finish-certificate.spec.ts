// Traces to: L2-120
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { BookPage } from '../pages/book.page';
import { ManageBookPage } from '../pages/manage-book.page';
import { ReviewPage } from '../pages/review.page';
import { ShelfPage } from '../pages/shelf.page';

test('Given Nia opens a finished book, when she presses Print my certificate, then a PDF named for her and the book downloads', async ({ page }) => {
  await signInAsNia(page);
  await new ShelfPage(page).openFinishedBook('Matilda');

  const download = await new BookPage(page).printCertificate();

  expect(download.suggestedFilename()).toBe('nia-matilda-certificate.pdf');
});

test('Given a book Nia is still reading, when she opens it, then there is no certificate to print', async ({ page }) => {
  await signInAsNia(page);
  const book = new BookPage(page);
  await book.open('b-lion');

  await expect(book.heading()).toHaveText('The Lion, the Witch and the Wardrobe');
  await expect(book.certificateLink()).toHaveCount(0);
});

test('Given a finished book awaiting its reward, when Dad presses Print certificate on Review, then the PDF downloads', async ({ page }) => {
  await signInAsDad(page);
  const review = new ReviewPage(page);
  await review.open();

  const download = await review.printCertificate('Matilda');

  expect(download.suggestedFilename()).toBe('nia-matilda-certificate.pdf');
});

test('Given a finished book, when Dad presses Print certificate on Manage book, then the PDF downloads', async ({ page }) => {
  await signInAsDad(page);
  const manage = new ManageBookPage(page);
  await manage.open('b-matilda');

  const download = await manage.printCertificate();

  expect(download.suggestedFilename()).toBe('nia-matilda-certificate.pdf');
});

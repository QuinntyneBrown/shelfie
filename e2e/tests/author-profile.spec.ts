// Traces to: L2-147, L2-149, L2-150
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addCatalogueCover, addDirectoryProfile, householdBooksTitled } from '../support/database';
import { DirectoryPage } from '../pages/directory.page';
import { AuthorProfilePage } from '../pages/author-profile.page';
import { AddBookPage } from '../pages/add-book.page';
import { ShelfPage } from '../pages/shelf.page';
import { fixture } from '../pages/profile-photo-dialog.page';

const FOX = { title: 'The Lighthouse Fox', chapters: 12, description: 'A fox cub keeps the lighthouse lamp burning.' };

test('Given approved Rosa, when Dad opens her from the directory, then her about, website and catalogue are shown, each book with Add to shelf', async ({ page }) => {
  await addDirectoryProfile({ kind: 'author', name: 'Rosa Delgado', bio: 'I write adventure stories.', website: 'https://rosadelgado.example.com', books: [FOX, { title: 'Pip and the Paper Moon', chapters: 9 }] });
  await signInAsDad(page);
  const directory = new DirectoryPage(page);
  await directory.open();
  await directory.view('Rosa Delgado');

  const author = new AuthorProfilePage(page);
  await expect(author.heading()).toHaveText('Rosa Delgado');
  await expect(author.about()).toHaveText('I write adventure stories.');
  await expect(author.website()).toHaveAttribute('href', 'https://rosadelgado.example.com');
  await expect(author.website()).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  await expect(author.bookTitles()).toHaveText(['The Lighthouse Fox', 'Pip and the Paper Moon']);
  await expect(author.book('The Lighthouse Fox')).toContainText(`12 chapters · ${FOX.description}`);
});

test('Given an approved author with no books, when Dad opens her, then the page says she hasn’t added any yet', async ({ page }) => {
  const id = await addDirectoryProfile({ kind: 'author', name: 'Rosa Delgado', bio: 'I write adventure stories.' });
  await signInAsDad(page);
  const author = new AuthorProfilePage(page);
  await author.open(id);

  await expect(author.noBooks()).toHaveText('Rosa hasn’t added any books yet.');
});

test('Given a hidden author, when Dad opens her link, then the profile isn’t available and he can go back to the directory', async ({ page }) => {
  const id = await addDirectoryProfile({ kind: 'author', name: 'Rosa Delgado', status: 'hidden', bio: 'I write adventure stories.', books: [FOX] });
  await signInAsDad(page);
  const author = new AuthorProfilePage(page);
  await author.open(id);

  await expect(author.notAvailable()).toBeVisible();
  await author.backToDirectory();
  await expect(new DirectoryPage(page).heading()).toHaveText('Directory');
});

test('Given Rosa’s book with a cover, when Dad adds it to the shelf, then Add a book is filled in from it and Nia sees the book with Rosa’s name like any other', async ({ page }) => {
  await addDirectoryProfile({ kind: 'author', name: 'Rosa Delgado', bio: 'I write adventure stories.', books: [FOX] });
  await addCatalogueCover('cb-rosadelgado-1', fixture('lion-cover.jpg'));
  await signInAsDad(page);
  const author = new AuthorProfilePage(page);
  await new DirectoryPage(page).open();
  await new DirectoryPage(page).view('Rosa Delgado');
  await author.addToShelf('The Lighthouse Fox');

  const addBook = new AddBookPage(page);
  await expect(addBook.titleField()).toHaveValue('The Lighthouse Fox');
  await expect(addBook.authorField()).toHaveValue('Rosa Delgado');
  await expect(addBook.chaptersField()).toHaveValue('12');
  await expect.poll(() => addBook.previewPictureLoaded()).toBe(true);
  await addBook.submit();

  await expect(page.getByRole('status').filter({ hasText: 'The Lighthouse Fox is on your shelf under Up next.' })).toBeVisible();
  expect(await householdBooksTitled('The Lighthouse Fox')).toEqual([{ household_id: 'h1', title: 'The Lighthouse Fox', author: 'Rosa Delgado', chapter_count: 12 }]);

  await page.context().clearCookies();
  await signInAsNia(page);
  const shelf = new ShelfPage(page);
  await expect(shelf.book('Up next', 'The Lighthouse Fox')).toContainText('Rosa Delgado');
  await expect.poll(() => shelf.coverPictureLoaded('Up next', 'The Lighthouse Fox')).toBe(true);
});

test('Given a catalogue book that is no longer listed, when Dad opens Add a book for it, then the form is empty and says the book isn’t available', async ({ page }) => {
  await addDirectoryProfile({ kind: 'author', name: 'Rosa Delgado', status: 'hidden', bio: 'I write adventure stories.', books: [FOX] });
  await signInAsDad(page);
  const addBook = new AddBookPage(page);
  await addBook.openFromCatalogue('cb-rosadelgado-1');

  await expect(addBook.unavailableNote()).toBeVisible();
  await expect(addBook.titleField()).toHaveValue('');
});

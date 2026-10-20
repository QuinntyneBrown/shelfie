// Traces to: L2-163, L2-168, L2-025
import { test, expect } from '../support/test';
import { signInAsDad, signInAsNia } from '../support/signed-in';
import { addDirectoryProfile } from '../support/database';
import { DirectoryPage } from '../pages/directory.page';
import { ErrorPage } from '../pages/error.page';

test.beforeEach(async () => {
  await addDirectoryProfile({
    kind: 'author',
    name: 'Rosa Delgado',
    bio: 'I write adventure stories for readers aged 7 to 11.',
    books: [
      { title: 'The Lighthouse Fox', chapters: 12 },
      { title: 'Pip and the Paper Moon', chapters: 9 },
    ],
  });
  await addDirectoryProfile({ kind: 'author', name: 'Jun Park', status: 'pending', bio: 'Funny dragon stories.' });
  await addDirectoryProfile({ kind: 'volunteer', name: 'Sam Okafor', bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: 'sam@example.com' });
  await addDirectoryProfile({ kind: 'volunteer', name: 'Helen Marsh', status: 'hidden', bio: 'Story club.', ages: 'Ages 5 to 8', contact: 'helen@example.com' });
});

test('Given Dad, when he opens the Directory tab, then approved authors are listed with their books and Volunteers lists approved volunteers under the no-vetting notice', async ({ page }) => {
  await signInAsDad(page);
  const directory = new DirectoryPage(page);
  await expect(directory.navigation()).toHaveText([/^Review/, /^Books/, /^Directory/, /^Settings/]);
  await directory.chooseDirectoryTab();

  await expect(directory.heading()).toHaveText('Directory');
  await expect(directory.names()).toHaveText(['Rosa Delgado']);
  await expect(directory.person('Rosa Delgado')).toContainText('2 books · I write adventure stories');

  await directory.showVolunteers();
  await expect(directory.noVettingNotice()).toBeVisible();
  await expect(directory.names()).toHaveText(['Sam Okafor']);
  await expect(directory.person('Sam Okafor')).toContainText('Ages 6 to 10 · Retired Year 3 teacher.');
});

test('Given the directory cannot be loaded, when Dad opens it, then an error with Try again shows', async ({ page }) => {
  await signInAsDad(page);
  const directory = new DirectoryPage(page);
  await directory.breakDirectory();
  await directory.open();

  await expect(directory.loadFailure()).toBeVisible();
  await directory.repairDirectory();
  await directory.tryAgain();
  await expect(directory.names()).toHaveText(['Rosa Delgado']);
});

test('Given Nia, then her navigation has no Directory and opening it by URL shows Grown-ups only', async ({ page }) => {
  await signInAsNia(page);
  const directory = new DirectoryPage(page);
  await expect(directory.navigation()).toHaveCount(0);

  await directory.open();
  await expect(new ErrorPage(page).heading()).toHaveText('This part is for grown-ups');
});

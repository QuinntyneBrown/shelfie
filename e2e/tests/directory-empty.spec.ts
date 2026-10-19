// Traces to: L2-153
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addDirectoryProfile } from '../support/database';
import { DirectoryPage } from '../pages/directory.page';

test('Given no approved authors or volunteers, when Dad opens the directory, then each list says there is nobody yet', async ({ page }) => {
  await addDirectoryProfile({ kind: 'author', name: 'Jun Park', status: 'pending', bio: 'Funny dragon stories.' });
  await signInAsDad(page);
  const directory = new DirectoryPage(page);
  await directory.open();

  await expect(directory.emptyState('No authors yet')).toBeVisible();
  await directory.showVolunteers();
  await expect(directory.emptyState('No volunteers yet')).toBeVisible();
});

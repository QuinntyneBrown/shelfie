// Traces to: L2-148, L2-151
import { test, expect } from '../support/test';
import { signInAsDad } from '../support/signed-in';
import { addDirectoryProfile } from '../support/database';
import { DirectoryPage } from '../pages/directory.page';
import { VolunteerProfilePage } from '../pages/volunteer-profile.page';

const CONTACT = 'sam.okafor@example.com · weekday afternoons';

test('Given approved Sam, when Dad opens him from the directory, then the ages he helps with, his about and his contact line are shown with the no-vetting notice', async ({ page }) => {
  await addDirectoryProfile({ kind: 'volunteer', name: 'Sam Okafor', bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: CONTACT });
  await signInAsDad(page);
  const directory = new DirectoryPage(page);
  await directory.open();
  await directory.showVolunteers();
  await directory.view('Sam Okafor');

  const volunteer = new VolunteerProfilePage(page);
  await expect(volunteer.heading()).toHaveText('Sam Okafor');
  await expect(volunteer.ages()).toHaveText('Ages 6 to 10');
  await expect(volunteer.contactCard()).toContainText(CONTACT);
  await expect(volunteer.contactCard().getByRole('link')).toHaveCount(0);
  await expect(volunteer.noVettingNotice()).toBeVisible();
});

test('Given a hidden volunteer, when Dad opens his link, then the profile isn’t available', async ({ page }) => {
  const id = await addDirectoryProfile({ kind: 'volunteer', name: 'Sam Okafor', status: 'hidden', bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: CONTACT });
  await signInAsDad(page);
  const volunteer = new VolunteerProfilePage(page);
  await volunteer.open(id);

  await expect(volunteer.notAvailable()).toBeVisible();
});

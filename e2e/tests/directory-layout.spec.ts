// Traces to: L2-160, L2-161, L2-165, L2-169, L2-170, L2-171, L2-025, L2-026
import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { joinAsRosa, signInAsDad } from '../support/signed-in';
import { addDirectoryProfile } from '../support/database';
import { JoinPage } from '../pages/join.page';
import { MyCataloguePage } from '../pages/my-catalogue.page';
import { MyProfilePage } from '../pages/my-profile.page';
import { DirectoryPage } from '../pages/directory.page';
import { AuthorProfilePage } from '../pages/author-profile.page';
import { VolunteerProfilePage } from '../pages/volunteer-profile.page';
import { ShellPage } from '../pages/shell.page';
import { settled } from '../support/screens';

const screens: { name: string; open: (page: Page) => Promise<unknown> }[] = [
  { name: 'Join', open: async (page) => { const join = new JoinPage(page); await join.open(); await expect(join.heading()).toBeVisible(); await settled(page); } },
  { name: 'My profile', open: async (page) => { await joinAsRosa(page); await expect(new MyProfilePage(page).nameField()).toBeVisible(); } },
  {
    name: 'My catalogue',
    open: async (page) => {
      await joinAsRosa(page);
      const catalogue = new MyCataloguePage(page);
      await catalogue.open();
      await expect(catalogue.emptyState()).toBeVisible();
    },
  },
  {
    name: 'the directory',
    open: async (page) => {
      await addDirectoryProfile({ kind: 'author', name: 'Rosa Delgado', bio: 'I write adventure stories.', books: [{ title: 'The Lighthouse Fox', chapters: 12 }] });
      await signInAsDad(page);
      const directory = new DirectoryPage(page);
      await directory.open();
      await expect(directory.names()).toHaveText(['Rosa Delgado']);
    },
  },
  {
    name: 'an author’s profile',
    open: async (page) => {
      const id = await addDirectoryProfile({ kind: 'author', name: 'Rosa Delgado', bio: 'I write adventure stories.', website: 'https://rosadelgado.example.com', books: [{ title: 'The Lighthouse Fox', chapters: 12, description: 'A fox cub keeps the lamp burning.' }] });
      await signInAsDad(page);
      const author = new AuthorProfilePage(page);
      await author.open(id);
      await expect(author.bookTitles()).toHaveText(['The Lighthouse Fox']);
    },
  },
  {
    name: 'a volunteer’s profile',
    open: async (page) => {
      const id = await addDirectoryProfile({ kind: 'volunteer', name: 'Sam Okafor', bio: 'Retired Year 3 teacher.', ages: 'Ages 6 to 10', contact: 'sam.okafor@example.com · weekday afternoons' });
      await signInAsDad(page);
      const volunteer = new VolunteerProfilePage(page);
      await volunteer.open(id);
      await expect(volunteer.heading()).toHaveText('Sam Okafor');
    },
  },
];

for (const width of [360, 768, 1280]) {
  for (const screen of screens) {
    test(`Given a ${width}px screen, when ${screen.name} shows, then nothing scrolls sideways and every control is at least 44 by 44`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await screen.open(page);
      const shell = new ShellPage(page);

      expect(await shell.scrollsSideways()).toBe(false);
      expect(await shell.undersizedControls()).toEqual([]);
    });
  }
}

for (const screen of screens) {
  test(`Given ${screen.name} shows, then an accessibility scan finds nothing serious or critical`, async ({ page }) => {
    await screen.open(page);

    expect(await new ShellPage(page).seriousAccessibilityProblems()).toEqual([]);
  });
}

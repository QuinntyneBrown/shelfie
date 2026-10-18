import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

/** A photo file the tests upload, from e2e/fixtures. */
export function fixture(name: string) {
  return join(import.meta.dirname, '../fixtures', name);
}

/** The "Your photo" dialog, where a person chooses, replaces or removes their own photo. */
export class ProfilePhotoDialog {
  constructor(private readonly page: Page) {}

  dialog() {
    return this.page.getByRole('dialog', { name: 'Your photo' });
  }

  /** Picks a file in the device's chooser behind "Choose a photo" or "Choose another". */
  async choose(file: string) {
    await this.dialog().getByLabel(/Choose a photo|Choose another/).setInputFiles(file);
  }

  success() {
    return this.dialog().getByRole('status').filter({ hasText: 'Looking great' });
  }

  async remove() {
    await this.dialog().getByRole('button', { name: 'Remove photo' }).click();
  }

  /** The bytes the API serves at a photo URL, as the signed-in person. */
  async download(url: string) {
    return (await this.page.request.get(url)).body();
  }

  async done() {
    await this.dialog().getByRole('button', { name: 'Done' }).click();
  }

  /** Uploads a photo for whoever is signed in, straight through the API. */
  uploadViaApi(file: string, type = 'image/jpeg') {
    return this.page.request.put('/api/profile/photo', {
      headers: { 'X-Requested-With': 'Shelfie', 'Content-Type': type },
      data: readFileSync(file),
    });
  }
}

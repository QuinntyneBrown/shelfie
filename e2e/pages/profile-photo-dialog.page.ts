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

  private chooser() {
    return this.dialog().getByLabel(/Choose a photo|Choose another/);
  }

  async chooseNotAPhoto() {
    await this.chooser().setInputFiles({ name: 'story.txt', mimeType: 'text/plain', buffer: Buffer.from('Once upon a time') });
  }

  /** A real JPEG name and type, but not a picture inside. */
  async chooseBrokenJpeg() {
    await this.chooser().setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not really a jpeg') });
  }

  async chooseTooLarge() {
    await this.chooser().setInputFiles({ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  }

  /** Every alert in the dialog: the picker's error and a failure banner. */
  problem() {
    return this.dialog().getByRole('alert');
  }

  chooseButton() {
    return this.dialog().locator('label.btn');
  }

  doneButton() {
    return this.dialog().getByRole('button', { name: 'Done' });
  }

  async tryAgain() {
    await this.dialog().getByRole('button', { name: 'Try again' }).click();
  }

  private uploads = 0;

  watchUploads() {
    this.page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().endsWith('/api/profile/photo')) this.uploads++;
    });
  }

  uploadCount() {
    return this.uploads;
  }

  async breakUploads() {
    await this.page.route('**/api/profile/photo', (route) => route.abort());
  }

  async repairUploads() {
    await this.page.unroute('**/api/profile/photo');
  }

  /** Holds uploads until the returned function is called. */
  async holdUploads() {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await this.page.route('**/api/profile/photo', async (route) => {
      await released;
      await route.continue();
    });
    return release;
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

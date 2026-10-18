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

  /** Uploads a photo for whoever is signed in, straight through the API. */
  uploadViaApi(file: string, type = 'image/jpeg') {
    return this.page.request.put('/api/profile/photo', {
      headers: { 'X-Requested-With': 'Shelfie', 'Content-Type': type },
      data: readFileSync(file),
    });
  }
}

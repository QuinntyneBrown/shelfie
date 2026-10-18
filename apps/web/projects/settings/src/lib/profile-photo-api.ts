import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

@Injectable({ providedIn: 'root' })
export class ProfilePhotoApi {
  private readonly api = inject(ApiClient);

  /** Uploads the signed-in person's own photo and returns its URL. */
  upload(file: File) {
    return this.api.put<{ photo: string }>('/profile/photo', file);
  }

  remove() {
    return this.api.delete('/profile/photo');
  }
}

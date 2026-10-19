import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

/** What an author or volunteer shows parents, and whether the operator has listed it. */
export interface MyProfile {
  role: 'author' | 'volunteer';
  name: string;
  status: 'pending' | 'approved' | 'hidden';
  bio: string;
  website: string | null;
  ages: string | null;
  contact: string | null;
  photo: string | null;
}

export interface MyProfileInput {
  name: string;
  bio: string;
  website?: string | null;
  ages?: string;
  contact?: string;
}

/** An author's or volunteer's own profile, photo and catalogue. */
@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly api = inject(ApiClient);

  profile() {
    return this.api.get<MyProfile>('/me');
  }

  save(input: MyProfileInput) {
    return this.api.put<MyProfile>('/me', input);
  }

  uploadPhoto(file: File) {
    return this.api.put<{ photo: string }>('/me/photo', file);
  }

  removePhoto() {
    return this.api.delete('/me/photo');
  }
}

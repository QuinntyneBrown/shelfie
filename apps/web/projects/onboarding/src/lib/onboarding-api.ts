import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface ReaderInput {
  name: string;
  color: string;
  username: string;
  password: string;
}

export interface ReaderView {
  id: string;
  name: string;
  color: string;
  username: string;
  photo: string | null;
}

export interface GalleryRewardInput {
  name: string;
  description: string;
  target: number;
}

export interface GalleryReward {
  id: string;
  name: string;
  target: number;
}

/** The wizard's calls: the same reader and reward routes Settings uses, plus marking the household done. */
@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private readonly api = inject(ApiClient);

  addReader(input: ReaderInput) {
    return this.api.post<ReaderView>('/readers', input);
  }

  addReward(input: GalleryRewardInput) {
    return this.api.post<GalleryReward>('/gallery-rewards', input);
  }

  /** The wizard is finished or skipped for the household; it never shows again on any device. */
  finish() {
    return this.api.post<void>('/settings/onboarded', {});
  }
}

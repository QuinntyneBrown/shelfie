import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface GalleryReward {
  id: string;
  name: string;
  target: number;
}

export interface GalleryRewardInput {
  name: string;
  target: number;
}

/** The household's reward gallery, which Nia picks her goal from. */
@Injectable({ providedIn: 'root' })
export class GalleryRewardsApi {
  private readonly api = inject(ApiClient);

  async list() {
    return (await this.api.get<{ rewards: GalleryReward[] }>('/gallery-rewards')).rewards;
  }

  add(input: GalleryRewardInput) {
    return this.api.post<GalleryReward>('/gallery-rewards', input);
  }

  update(id: string, input: GalleryRewardInput) {
    return this.api.patch<GalleryReward>(`/gallery-rewards/${id}`, input);
  }

  remove(id: string) {
    return this.api.delete(`/gallery-rewards/${id}`);
  }
}

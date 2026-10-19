import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface StreakReward {
  milestone: number;
  name: string | null;
  /** The day it was earned (YYYY-MM-DD); null until then. */
  earnedOn: string | null;
  givenOn: string | null;
}

/** The rewards a parent sets for the 7, 30 and 100 day reading streak milestones. */
@Injectable({ providedIn: 'root' })
export class StreakRewardsApi {
  private readonly api = inject(ApiClient);

  async list() {
    return (await this.api.get<{ rewards: StreakReward[] }>('/streak-rewards')).rewards;
  }

  set(milestone: number, name: string) {
    return this.api.put<StreakReward>(`/streak-rewards/${milestone}`, { name });
  }

  clear(milestone: number) {
    return this.api.delete(`/streak-rewards/${milestone}`);
  }
}

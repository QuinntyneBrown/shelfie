import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface StreakReward {
  milestone: number;
  name: string | null;
  /** Whole dollars, or null for a reward that isn't money. */
  amount: number | null;
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

  set(milestone: number, name: string, amount: number | null) {
    return this.api.put<StreakReward>(`/streak-rewards/${milestone}`, { name, amount });
  }

  clear(milestone: number) {
    return this.api.delete(`/streak-rewards/${milestone}`);
  }
}

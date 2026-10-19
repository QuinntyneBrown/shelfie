import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface HelperReward {
  name: string;
  targetMinutes: number;
  /** This round's helper minutes per reader id. */
  minutes: Record<string, number>;
  earnedBy: { id: string; name: string } | null;
  /** The day the last round was given (YYYY-MM-DD); null before the first. */
  givenOn: string | null;
}

/** The household's one helper reward, earned by reading together. */
@Injectable({ providedIn: 'root' })
export class HelperRewardApi {
  private readonly api = inject(ApiClient);

  async get() {
    return (await this.api.get<{ reward: HelperReward | null }>('/helper-reward')).reward;
  }

  set(name: string, targetMinutes: number) {
    return this.api.put<HelperReward>('/helper-reward', { name, targetMinutes });
  }
}

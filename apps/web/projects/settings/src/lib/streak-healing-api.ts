import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

/** The one activity a parent names to heal a missed reading day a week; null means healing is off. */
@Injectable({ providedIn: 'root' })
export class StreakHealingApi {
  private readonly api = inject(ApiClient);

  async get() {
    return (await this.api.get<{ activity: string | null }>('/streak-healing')).activity;
  }

  async set(name: string) {
    return (await this.api.put<{ activity: string }>('/streak-healing/activity', { name })).activity;
  }

  clear() {
    return this.api.delete('/streak-healing/activity');
  }
}

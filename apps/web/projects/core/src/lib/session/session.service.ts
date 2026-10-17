import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';

export interface Session {
  profileId: string;
  name: string;
  role: 'reader' | 'grown_up';
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiClient);
  readonly current = signal<Session | null>(null);

  /** Asks the API whether this browser still has a session; run once at start-up. */
  async restore() {
    try {
      this.current.set(await this.api.get<Session>('/auth/session'));
    } catch {
      this.current.set(null);
    }
  }
}

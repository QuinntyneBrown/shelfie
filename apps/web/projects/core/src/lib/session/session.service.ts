import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';

export interface Session {
  profileId: string;
  name: string;
  role: 'reader' | 'grown_up';
  color: string;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiClient);
  readonly current = signal<Session | null>(null);
  /** Set when the API reports the session ran out, so sign-in can say why. */
  readonly expired = signal(false);

  /** Ends the session on the server and forgets it here. */
  async signOut() {
    try {
      await this.api.post('/auth/sign-out', {});
    } finally {
      this.current.set(null);
    }
  }

  /** Asks the API whether this browser still has a session; run once at start-up. */
  async restore() {
    try {
      this.current.set(await this.api.get<Session>('/auth/session'));
    } catch {
      this.current.set(null);
    }
  }
}

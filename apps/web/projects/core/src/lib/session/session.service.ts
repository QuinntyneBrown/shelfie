import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { PushService } from '../push/push.service';

export interface Session {
  profileId: string;
  name: string;
  username: string;
  role: 'reader' | 'parent';
  color: string;
  email: string | null;
  theme: 'device' | 'light' | 'dark';
  /** The URL of the person's own photo, or null when they have none. */
  photo: string | null;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiClient);
  private readonly push = inject(PushService);
  readonly current = signal<Session | null>(null);
  /** Set when the API reports the session ran out, so sign-in can say why. */
  readonly expired = signal(false);

  /** Shows changed details straight away, without another sign-in. */
  update(changes: Partial<Pick<Session, 'name' | 'theme' | 'color' | 'photo'>>) {
    this.current.update((session) => (session ? { ...session, ...changes } : session));
  }

  /** Ends the session on the server and forgets it here; this browser stops hearing for the person first. */
  async signOut() {
    await this.push.forget();
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

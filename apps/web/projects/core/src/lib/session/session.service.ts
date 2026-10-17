import { Injectable, signal } from '@angular/core';

export interface Session {
  profileId: string;
  name: string;
  role: 'reader' | 'grown_up';
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly current = signal<Session | null>(null);
}

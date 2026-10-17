import { Injectable, inject } from '@angular/core';
import { ApiClient, Session } from 'core';

export interface ProfileSummary {
  id: string;
  name: string;
  role: 'reader' | 'grown_up';
  color: string;
  email: string | null;
  theme: 'device' | 'light' | 'dark';
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);

  profiles() {
    return this.api.get<ProfileSummary[]>('/auth/profiles');
  }

  signInWithPassword(email: string, password: string) {
    return this.api.post<Session>('/auth/password', { email, password });
  }

  signInWithPin(profileId: string, pin: string) {
    return this.api.post<Session>('/auth/pin', { profileId, pin });
  }
}

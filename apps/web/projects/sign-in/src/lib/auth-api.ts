import { Injectable, inject } from '@angular/core';
import { ApiClient, Session } from 'core';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);

  forgotPassword(email: string) {
    return this.api.post<void>('/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string) {
    return this.api.post<Session>('/auth/reset-password', { token, password });
  }

  getInvite(token: string) {
    return this.api.get<{ email: string; invitedBy: string }>(`/auth/invites/${encodeURIComponent(token)}`);
  }

  acceptInvite(account: { token: string; name: string; username: string; password: string }) {
    return this.api.post<Session>('/auth/accept-invite', account);
  }

  signUp(account: { name: string; email: string; username: string; password: string }) {
    return this.api.post<Session>('/auth/sign-up', account);
  }

  signInWithPassword(username: string, password: string, remember: boolean) {
    return this.api.post<Session>('/auth/password', { username, password, remember });
  }
}

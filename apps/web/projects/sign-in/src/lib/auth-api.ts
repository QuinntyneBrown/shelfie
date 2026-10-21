import { Injectable, inject } from '@angular/core';
import { ProviderName } from 'components';
import { ApiClient, Session } from 'core';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);

  /** The providers a parent can continue with, in display order. */
  providers() {
    return this.api.get<{ providers: ProviderName[] }>('/auth/providers');
  }

  forgotPassword(email: string) {
    return this.api.post<void>('/auth/forgot-password', { email });
  }

  /** Confirms the address a confirm link was mailed to, and answers with it. */
  verifyEmail(token: string) {
    return this.api.post<{ email: string }>('/auth/verify-email', { token });
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

  join(account: { kind: 'author' | 'volunteer'; name: string; email: string; username: string; password: string }) {
    return this.api.post<Session>('/auth/join', account);
  }

  signInWithPassword(username: string, password: string, remember: boolean) {
    return this.api.post<Session>('/auth/password', { username, password, remember });
  }
}

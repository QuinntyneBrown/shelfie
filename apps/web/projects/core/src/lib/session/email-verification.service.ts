import { Injectable, inject } from '@angular/core';
import { ApiClient, ApiError } from '../api/api-client';
import { ToastService } from '../toast/toast.service';

/** Send it again: mails the signed-in parent a fresh confirm-your-e-mail link and says how it went (L2-149). */
@Injectable({ providedIn: 'root' })
export class EmailVerificationService {
  private readonly api = inject(ApiClient);
  private readonly toasts = inject(ToastService);

  async resend() {
    try {
      await this.api.post<void>('/auth/verify-email/resend', {});
      this.toasts.show({ title: 'Sent. Check your inbox.', text: 'Only the newest link works.' });
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        this.toasts.show({
          severity: 'warning',
          title: 'That’s a few links already',
          text: 'Check your inbox and spam folder, or try again in 10 minutes.',
        });
      } else {
        this.toasts.show({
          severity: 'danger',
          title: 'The link wasn’t sent',
          text: 'Check your connection, then press Send it again.',
        });
      }
    }
  }
}

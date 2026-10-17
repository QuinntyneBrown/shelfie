import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, TextField } from 'components';
import { AuthApi } from '../auth-api';

@Component({
  selector: 'sh-forgot-password-page',
  imports: [Button, RouterLink, TextField],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly api = inject(AuthApi);

  protected readonly email = signal('');
  protected readonly sentTo = signal<string | null>(null);
  protected readonly sending = signal(false);

  protected async send() {
    if (this.sending()) return;
    this.sending.set(true);
    try {
      const email = this.email().trim();
      await this.api.forgotPassword(email);
      this.sentTo.set(email);
    } finally {
      this.sending.set(false);
    }
  }
}

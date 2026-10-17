import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banner, Button, TextField } from 'components';
import { ApiError } from 'core';
import { AuthApi } from '../auth-api';

@Component({
  selector: 'sh-forgot-password-page',
  imports: [Banner, Button, RouterLink, TextField],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly api = inject(AuthApi);

  protected readonly email = signal('');
  protected readonly sentTo = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly emailError = signal<string | null>(null);
  protected readonly unreachable = signal(false);

  protected async send() {
    if (this.sending()) return;
    const incomplete = !/^\S+@\S+\.\S+$/.test(this.email().trim());
    this.emailError.set(
      incomplete ? 'Enter the e-mail address you sign in with, like name@example.com.' : null,
    );
    if (incomplete) return;

    this.sending.set(true);
    this.unreachable.set(false);
    try {
      const email = this.email().trim();
      await this.api.forgotPassword(email);
      this.sentTo.set(email);
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.unreachable.set(true);
    } finally {
      this.sending.set(false);
    }
  }
}

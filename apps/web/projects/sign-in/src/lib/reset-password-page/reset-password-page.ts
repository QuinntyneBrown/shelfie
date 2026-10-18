import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banner, Button, TextField } from 'components';
import { ApiError, SessionService } from 'core';
import { AuthApi } from '../auth-api';
import { AuthLayout } from '../auth-layout/auth-layout';

@Component({
  selector: 'sh-reset-password-page',
  imports: [AuthLayout, Banner, Button, RouterLink, TextField],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);

  /** Query parameters from the mailed link. The address is only shown; the server reads the token. */
  readonly token = input<string>();
  readonly email = input<string>();

  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly saving = signal(false);
  protected readonly done = signal(false);
  protected readonly linkExpired = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly confirmError = signal<string | null>(null);
  protected readonly problems = computed(() => {
    const found: string[] = [];
    if (this.passwordError()) found.push('Password is too short');
    if (this.confirmError()) found.push('Passwords don’t match');
    return found;
  });

  protected async save() {
    if (this.saving()) return;
    this.passwordError.set(this.password().length < 8 ? 'Use at least 8 characters.' : null);
    this.confirmError.set(
      this.password() !== this.confirm()
        ? 'These don’t match. Type the same password in both boxes.'
        : null,
    );
    if (this.problems().length) return;

    this.saving.set(true);
    try {
      this.session.current.set(await this.api.resetPassword(this.token() ?? '', this.password()));
      this.done.set(true);
    } catch (e) {
      if (!(e instanceof ApiError) || e.type !== 'reset-token-invalid') throw e;
      this.linkExpired.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}

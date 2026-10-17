import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, TextField } from 'components';
import { SessionService } from 'core';
import { AuthApi } from '../auth-api';

@Component({
  selector: 'sh-reset-password-page',
  imports: [Button, RouterLink, TextField],
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

  protected async save() {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      this.session.current.set(await this.api.resetPassword(this.token() ?? '', this.password()));
      this.done.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}

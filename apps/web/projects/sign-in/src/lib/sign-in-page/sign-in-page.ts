import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthLayout, Banner, Button, TextField } from 'components';
import { ApiError, SessionService, homeOf } from 'core';
import { AuthApi } from '../auth-api';

@Component({
  selector: 'sh-sign-in-page',
  imports: [AuthLayout, Banner, Button, RouterLink, TextField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  /** Query parameter: 'expired' when the session ran out. */
  readonly reason = input<string>();
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly remember = signal(true);
  protected readonly usernameError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly missing = signal<string[]>([]);
  protected readonly credentialsWrong = signal(false);
  protected readonly tooManyTries = signal(false);
  protected readonly submitting = signal(false);
  protected readonly unreachable = signal(false);
  private readonly summary = viewChild<Banner>('summary');

  protected async submit() {
    if (this.submitting()) return;
    this.credentialsWrong.set(false);
    this.tooManyTries.set(false);
    this.unreachable.set(false);
    this.usernameError.set(this.username().trim() ? null : 'Type your username.');
    this.passwordError.set(this.password() ? null : 'Type your password.');
    this.missing.set(
      [
        this.usernameError() && 'Type your username',
        this.passwordError() && 'Type your password',
      ].filter((p): p is string => !!p),
    );
    if (this.missing().length) {
      setTimeout(() => this.summary()?.focus());
      return;
    }

    this.submitting.set(true);
    let session;
    try {
      session = await this.api.signInWithPassword(
        this.username().trim(),
        this.password(),
        this.remember(),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        this.tooManyTries.set(true);
      } else if (e instanceof ApiError && e.type === 'credentials-invalid') {
        this.credentialsWrong.set(true);
        this.passwordError.set('Username or password is wrong.');
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.unreachable.set(true);
        return;
      }
      setTimeout(() => this.summary()?.focus());
      return;
    } finally {
      this.submitting.set(false);
    }
    this.session.current.set(session);
    await this.router.navigateByUrl(homeOf(session));
  }
}

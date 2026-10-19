import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthLayout, Banner, Button, TextField } from 'components';
import { ApiError, SessionService, homeOf } from 'core';
import { AuthApi } from '../auth-api';

export const USERNAME_RULE = /^[A-Za-z0-9._]{3,20}$/;

/** What is wrong with a username, or null. */
export function usernameProblem(username: string): string | null {
  if (username.length < 3 || username.length > 20) return '3–20 characters.';
  return USERNAME_RULE.test(username) ? null : 'Letters, numbers, . and _ only.';
}

@Component({
  selector: 'sh-sign-up-page',
  imports: [AuthLayout, Banner, Button, RouterLink, TextField],
  templateUrl: './sign-up-page.html',
  styleUrl: './sign-up-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpPage {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly emailError = signal<string | null>(null);
  protected readonly usernameError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly confirmError = signal<string | null>(null);
  protected readonly problems = signal<string[]>([]);
  protected readonly submitting = signal(false);
  protected readonly unreachable = signal(false);
  private readonly summary = viewChild<Banner>('summary');

  protected async submit() {
    if (this.submitting()) return;
    this.unreachable.set(false);
    const name = this.name().trim();
    this.nameError.set(!name ? 'Enter your name.' : name.length > 40 ? 'Use 40 characters or fewer.' : null);
    this.emailError.set(/^\S+@\S+\.\S+$/.test(this.email().trim()) ? null : 'Enter a valid e-mail.');
    this.usernameError.set(usernameProblem(this.username()));
    this.passwordError.set(this.password().length < 8 ? 'At least 8 characters.' : null);
    this.confirmError.set(this.password() === this.confirm() ? null : 'These don’t match.');
    this.summarise({
      name: 'Fix the name',
      email: 'Fix the e-mail',
      username: 'Fix the username',
      password: 'Use 8+ characters',
      confirm: 'Passwords don’t match',
    });
    if (this.problems().length) return;

    this.submitting.set(true);
    let session;
    try {
      session = await this.api.signUp({
        name,
        email: this.email().trim(),
        username: this.username(),
        password: this.password(),
      });
    } catch (e) {
      if (e instanceof ApiError && e.type === 'taken') {
        const fields = e.body['fields'] as string[];
        if (fields.includes('email')) this.emailError.set('That e-mail already has an account.');
        if (fields.includes('username')) this.usernameError.set('That username is taken.');
        this.summarise({ email: 'E-mail is taken', username: 'Username is taken' });
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.unreachable.set(true);
      }
      return;
    } finally {
      this.submitting.set(false);
    }
    this.session.current.set(session);
    await this.router.navigateByUrl(homeOf(session));
  }

  /** Lists one line per field in error, in form order, and puts focus on the list. */
  private summarise(lines: Partial<Record<'name' | 'email' | 'username' | 'password' | 'confirm', string>>) {
    const errors = {
      name: this.nameError(),
      email: this.emailError(),
      username: this.usernameError(),
      password: this.passwordError(),
      confirm: this.confirmError(),
    };
    this.problems.set(
      (Object.keys(lines) as (keyof typeof lines)[]).filter((f) => errors[f]).map((f) => lines[f]!),
    );
    if (this.problems().length) setTimeout(() => this.summary()?.focus());
  }
}

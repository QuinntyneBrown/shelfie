import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Banner, Button, TextField } from 'components';
import { ApiError, SessionService } from 'core';
import { AuthApi } from '../auth-api';
import { AuthLayout } from '../auth-layout/auth-layout';
import { usernameProblem } from '../sign-up-page/sign-up-page';

type Field = 'name' | 'email' | 'username' | 'password' | 'confirm';

/** Join as an author or a reading volunteer: an account outside any household (ADR-0019). */
@Component({
  selector: 'sh-join-page',
  imports: [AuthLayout, Banner, Button, RouterLink, TextField],
  templateUrl: './join-page.html',
  styleUrl: './join-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinPage {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly kind = signal<'author' | 'volunteer'>('author');
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
    this.nameError.set(!name ? 'Enter your name as parents will see it.' : name.length > 40 ? 'Use 40 characters or fewer.' : null);
    this.emailError.set(/^\S+@\S+\.\S+$/.test(this.email().trim()) ? null : 'Enter a valid e-mail.');
    this.usernameError.set(usernameProblem(this.username()));
    this.passwordError.set(this.password().length < 8 ? 'At least 8 characters.' : null);
    this.confirmError.set(this.password() === this.confirm() ? null : 'These don’t match.');
    this.summarise({
      name: 'Add your name',
      email: 'Fix the e-mail',
      username: 'Fix the username',
      password: 'Use 8+ characters',
      confirm: 'Passwords don’t match',
    });
    if (this.problems().length) return;

    this.submitting.set(true);
    let session;
    try {
      session = await this.api.join({
        kind: this.kind(),
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
    await this.router.navigateByUrl('/me');
  }

  /** Lists one line per field in error, in form order, and puts focus on the list. */
  private summarise(lines: Partial<Record<Field, string>>) {
    const errors: Record<Field, string | null> = {
      name: this.nameError(),
      email: this.emailError(),
      username: this.usernameError(),
      password: this.passwordError(),
      confirm: this.confirmError(),
    };
    this.problems.set((Object.keys(lines) as Field[]).filter((f) => errors[f]).map((f) => lines[f]!));
    if (this.problems().length) setTimeout(() => this.summary()?.focus());
  }
}

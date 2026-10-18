import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Banner, Button, TextField } from 'components';
import { ApiError, SessionService } from 'core';
import { AuthApi } from '../auth-api';
import { AuthLayout } from '../auth-layout/auth-layout';
import { usernameProblem } from '../sign-up-page/sign-up-page';

@Component({
  selector: 'sh-accept-invite-page',
  imports: [AuthLayout, Banner, Button, RouterLink, TextField],
  templateUrl: './accept-invite-page.html',
  styleUrl: './accept-invite-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvitePage implements OnInit {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** Query parameter from the mailed link. */
  readonly token = input<string>();

  protected readonly invite = signal<{ email: string; invitedBy: string } | null>(null);
  /** Set once the link proves unknown, used or past its 7 days. */
  protected readonly expired = signal(false);
  /** Who to ask for a new link, when a spent link still names its sender. */
  protected readonly invitedBy = signal<string | null>(null);
  /** Set when the invited address got an account while the invite was pending. */
  protected readonly emailTaken = signal(false);
  protected readonly name = signal('');
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly usernameError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly confirmError = signal<string | null>(null);
  protected readonly problems = signal<string[]>([]);
  protected readonly submitting = signal(false);
  protected readonly unreachable = signal(false);
  private readonly summary = viewChild<Banner>('summary');

  /** The token input is bound by now; the link is checked at once so an expired one says so before any typing. */
  async ngOnInit() {
    try {
      const invite = await this.api.getInvite(this.token() ?? '');
      this.invite.set(invite);
      this.invitedBy.set(invite.invitedBy);
    } catch (e) {
      if (!(e instanceof ApiError) || e.type !== 'invite-invalid') throw e;
      this.invitedBy.set((e.body['invitedBy'] as string | undefined) ?? null);
      this.expired.set(true);
    }
  }

  protected async submit() {
    if (this.submitting()) return;
    this.unreachable.set(false);
    const name = this.name().trim();
    this.nameError.set(!name ? 'Enter your name.' : name.length > 40 ? 'Use 40 characters or fewer.' : null);
    this.usernameError.set(usernameProblem(this.username()));
    this.passwordError.set(this.password().length < 8 ? 'At least 8 characters.' : null);
    this.confirmError.set(this.password() === this.confirm() ? null : 'These don’t match.');
    this.summarise();
    if (this.problems().length) return;

    this.submitting.set(true);
    let session;
    try {
      session = await this.api.acceptInvite({
        token: this.token() ?? '',
        name,
        username: this.username(),
        password: this.password(),
      });
    } catch (e) {
      if (e instanceof ApiError && e.type === 'username-taken') {
        this.usernameError.set('That username is taken.');
        this.summarise();
      } else if (e instanceof ApiError && e.type === 'invite-invalid') {
        this.expired.set(true);
      } else if (e instanceof ApiError && e.type === 'email-taken') {
        this.emailTaken.set(true);
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
    await this.router.navigateByUrl('/review');
  }

  private summarise() {
    this.problems.set(
      [
        this.nameError() && 'Fix the name',
        this.usernameError() && (this.usernameError() === 'That username is taken.' ? 'Username is taken' : 'Fix the username'),
        this.passwordError() && 'Use 8+ characters',
        this.confirmError() && 'Passwords don’t match',
      ].filter((p): p is string => !!p),
    );
    if (this.problems().length) setTimeout(() => this.summary()?.focus());
  }
}

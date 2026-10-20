import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthLayout, Button, Skeleton } from 'components';
import { ApiError, EmailVerificationService, homeOf, SessionService } from 'core';
import { AuthApi } from '../auth-api';

/** Opened from the confirm-your-e-mail link: confirms the address as it opens. It never signs anyone in or out. */
@Component({
  selector: 'sh-verify-email-page',
  imports: [AuthLayout, Button, RouterLink, Skeleton],
  templateUrl: './verify-email-page.html',
  styleUrl: './verify-email-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPage implements OnInit {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly verification = inject(EmailVerificationService);

  /** Query parameter from the mailed link. */
  readonly token = input<string>();

  protected readonly state = signal<'verifying' | 'success' | 'error'>('verifying');
  protected readonly email = signal('');
  protected readonly sending = signal(false);
  protected readonly signedIn = computed(() => this.session.current() !== null);
  protected readonly home = computed(() => {
    const current = this.session.current();
    return current ? homeOf(current) : '/sign-in';
  });

  async ngOnInit() {
    try {
      this.email.set((await this.api.verifyEmail(this.token() ?? '')).email);
      // The confirmed address may be this browser's parent's, so read the session again to drop the banner.
      if (this.signedIn()) await this.session.restore();
      this.state.set('success');
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 400) throw e;
      this.state.set('error');
    }
  }

  protected async sendNewLink() {
    if (this.sending()) return;
    this.sending.set(true);
    try {
      await this.verification.resend();
    } finally {
      this.sending.set(false);
    }
  }
}

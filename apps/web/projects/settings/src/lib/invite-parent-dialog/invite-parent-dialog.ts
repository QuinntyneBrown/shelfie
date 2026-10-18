import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, TextField } from 'components';
import { ApiError } from 'core';
import { InvitesApi } from '../invites-api';
import { InviteView } from '../settings-api';

/** Invites another parent by e-mail; sends through the API and reports the pending invite. */
@Component({
  selector: 'sh-invite-parent-dialog',
  imports: [Banner, Dialog, TextField],
  templateUrl: './invite-parent-dialog.html',
  styleUrl: './invite-parent-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteParentDialog {
  private readonly api = inject(InvitesApi);

  readonly open = input(false);
  readonly sent = output<InviteView>();
  readonly closed = output<void>();

  protected readonly email = signal('');
  protected readonly emailError = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  /** The address the invite went to, once it has. */
  protected readonly sentTo = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.email.set('');
      this.emailError.set(null);
      this.failed.set(false);
      this.sentTo.set(null);
    });
  }

  protected async send() {
    if (this.busy()) return;
    this.failed.set(false);
    const email = this.email().trim();
    this.emailError.set(/^\S+@\S+\.\S+$/.test(email) ? null : 'Enter a valid e-mail.');
    if (this.emailError()) return;

    this.busy.set(true);
    try {
      const invite = await this.api.send(email);
      this.sentTo.set(invite.email);
      this.sent.emit(invite);
    } catch (e) {
      if (e instanceof ApiError && e.type === 'email-in-use') {
        this.emailError.set('That e-mail already has an account.');
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failed.set(true);
      }
    } finally {
      this.busy.set(false);
    }
  }
}

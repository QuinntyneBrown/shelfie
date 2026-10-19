import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Banner } from 'components';
import { PushService, SessionService, ToastService } from 'core';

const DISMISSED = 'shelfie.push-offer.dismissed';

function dismissedBefore() {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false;
  }
}

/** A reader cannot open Settings, so her shelf offers notifications once; "Not now" is remembered on this device. */
@Component({
  selector: 'sh-push-offer',
  imports: [Banner],
  templateUrl: './push-offer.html',
  styleUrl: './push-offer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PushOffer {
  readonly grownUpName = input.required<string>();
  private readonly push = inject(PushService);
  private readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);
  private readonly dismissed = signal(dismissedBefore());
  protected readonly visible = computed(
    () => this.session.current()?.role === 'reader' && this.push.state() === 'off' && !this.dismissed(),
  );

  constructor() {
    if (this.session.current()?.role === 'reader') void this.push.init();
  }

  protected async turnOn() {
    try {
      await this.push.turnOn();
      if (this.push.state() === 'on') {
        this.toasts.show({ title: 'Notifications are on', text: `You’ll hear when ${this.grownUpName()} sends a sticker or a reward.` });
      }
    } catch {
      this.toasts.show({ severity: 'warning', title: 'Couldn’t turn notifications on. Try again.' });
    }
  }

  protected notNow() {
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      // Without storage it comes back next visit, which is harmless.
    }
    this.dismissed.set(true);
  }
}

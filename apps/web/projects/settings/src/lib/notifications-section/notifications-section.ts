import { ChangeDetectionStrategy, Component, inject, input, model, signal, viewChild } from '@angular/core';
import { Banner, Switch } from 'components';
import { PushService, ToastService } from 'core';
import { NotificationChoices } from '../settings-api';

/** The Notifications card: this device's switch, which acts at once, and the household's six choices, which save with the form. */
@Component({
  selector: 'sh-notifications-section',
  imports: [Banner, Switch],
  templateUrl: './notifications-section.html',
  styleUrl: './notifications-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsSection {
  protected readonly push = inject(PushService);
  private readonly toasts = inject(ToastService);

  /** Who hears about sticker and reward choices, by name. */
  readonly readerNames = input('Your reader');
  readonly choices = model.required<NotificationChoices>();
  protected readonly busy = signal(false);
  private readonly device = viewChild<Switch>('device');

  constructor() {
    void this.push.init();
  }

  protected setChoice(key: keyof NotificationChoices, on: boolean) {
    this.choices.update((choices) => ({ ...choices, [key]: on }));
  }

  protected async setDevice(on: boolean) {
    // Putting the switch back after a refusal tells us again; there is nothing to do for a state we are already in.
    if (on === (this.push.state() === 'on')) return;
    this.busy.set(true);
    try {
      if (on) {
        await this.push.turnOn();
        if (this.push.state() === 'on') this.toasts.show({ title: 'Notifications are on', text: 'This device will ping you when ' + this.readerNames() + ' logs a chapter.' });
      } else {
        await this.push.turnOff();
      }
    } catch {
      this.toasts.show({ severity: 'warning', title: 'Couldn’t turn notifications on. Try again.' });
    } finally {
      // The switch has already flipped itself; put it back when the browser said no.
      this.device()?.checked.set(this.push.state() === 'on');
      this.busy.set(false);
    }
  }
}

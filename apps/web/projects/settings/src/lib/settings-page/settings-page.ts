import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Banner, Button, ColorPicker, TextField } from 'components';
import { SessionService } from 'core';
import { SettingsApi } from '../settings-api';

const COLORS = ['rose', 'sky', 'sun', 'mint', 'lilac'];

@Component({
  selector: 'sh-settings-page',
  imports: [Banner, Button, ColorPicker, TextField],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly api = inject(SettingsApi);
  private readonly session = inject(SessionService);

  protected readonly colors = COLORS;
  protected readonly loaded = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly readerName = signal('');
  protected readonly readerColor = signal('rose');
  protected readonly pin = signal('');
  protected readonly grownUpName = signal('');
  protected readonly email = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly currentPassword = signal('');

  constructor() {
    this.api.get().then((view) => {
      this.readerName.set(view.reader.name);
      this.readerColor.set(view.reader.color);
      this.grownUpName.set(view.grownUp.name);
      this.email.set(view.grownUp.email);
      this.loaded.set(true);
    });
  }

  protected async save() {
    if (this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    try {
      const view = await this.api.save({
        reader: {
          name: this.readerName(),
          color: this.readerColor(),
          ...(this.pin() ? { pin: this.pin() } : {}),
        },
        grownUp: { name: this.grownUpName(), email: this.email() },
      });
      this.session.update(view.grownUp.name);
      this.pin.set('');
      this.saved.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}

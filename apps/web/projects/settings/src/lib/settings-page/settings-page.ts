import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ColorPicker, TextField } from 'components';
import { SettingsApi } from '../settings-api';

const COLORS = ['rose', 'sky', 'sun', 'mint', 'lilac'];

@Component({
  selector: 'sh-settings-page',
  imports: [ColorPicker, TextField],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly api = inject(SettingsApi);

  protected readonly colors = COLORS;
  protected readonly loaded = signal(false);
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
}

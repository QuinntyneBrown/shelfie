import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Banner, Button, ErrorState, Skeleton, TextField } from 'components';
import { ApiError, SessionService, ToastService } from 'core';
import { EditReaderDialog } from '../edit-reader-dialog/edit-reader-dialog';
import { ReaderView, SettingsApi, SettingsView, Theme } from '../settings-api';

@Component({
  selector: 'sh-settings-page',
  imports: [Banner, Button, EditReaderDialog, ErrorState, Skeleton, TextField],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly api = inject(SettingsApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly view = signal<SettingsView | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly nameError = signal<string | null>(null);
  protected readonly emailError = signal<string | null>(null);
  protected readonly newPasswordError = signal<string | null>(null);
  protected readonly confirmError = signal<string | null>(null);
  protected readonly problems = computed(() =>
    [
      this.nameError() && 'Fix your name',
      this.emailError() && 'E-mail needs an @ and a dot',
      this.newPasswordError() && 'Use 8+ characters',
      this.confirmError() && 'Passwords don’t match',
    ].filter((p): p is string => !!p),
  );
  protected readonly readerDialogOpen = signal(false);
  protected readonly editingReader = signal<ReaderView | null>(null);
  protected readonly theme = signal<Theme>('device');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly currentPassword = signal('');

  constructor() {
    this.load();
  }

  protected async load() {
    this.loadFailed.set(false);
    this.view.set(null);
    try {
      const view = await this.api.get();
      this.theme.set(view.theme);
      this.name.set(view.account.name);
      this.email.set(view.account.email);
      this.view.set(view);
    } catch {
      this.loadFailed.set(true);
    }
  }

  protected openReaderDialog(reader: ReaderView | null) {
    this.editingReader.set(reader);
    this.readerDialogOpen.set(true);
  }

  /** Puts the saved reader in the list, in place of the one edited or at the end. */
  protected readerSaved(reader: ReaderView) {
    this.readerDialogOpen.set(false);
    const view = this.view()!;
    const edited = this.editingReader();
    const readers = edited
      ? view.readers.map((r) => (r.id === reader.id ? reader : r))
      : [...view.readers, reader];
    this.view.set({ ...view, readers });
    this.toasts.show({ title: edited ? `${reader.name} saved` : `${reader.name} added` });
  }

  protected initial(name: string) {
    return name.charAt(0).toUpperCase();
  }

  protected async signOut() {
    await this.session.signOut();
    await this.router.navigateByUrl('/sign-in');
  }

  protected async save() {
    if (this.saving()) return;
    const name = this.name().trim();
    this.nameError.set(!name ? 'Enter a name.' : name.length > 40 ? 'Use 40 characters or fewer.' : null);
    this.emailError.set(
      /^\S+@\S+\.\S+$/.test(this.email().trim())
        ? null
        : 'Enter an e-mail address like name@example.com.',
    );
    const newPassword = this.newPassword();
    this.newPasswordError.set(
      newPassword && newPassword.length < 8 ? 'Use at least 8 characters.' : null,
    );
    this.confirmError.set(
      newPassword !== this.confirmPassword()
        ? 'These don’t match. Type the same password in both boxes.'
        : null,
    );
    if (this.problems().length) return;
    this.saving.set(true);
    this.saved.set(false);
    this.failure.set(null);
    try {
      const view = await this.api.save({
        theme: this.theme(),
        account: {
          name,
          email: this.email().trim(),
          ...(newPassword ? { newPassword } : {}),
          ...(this.currentPassword() ? { currentPassword: this.currentPassword() } : {}),
        },
      });
      this.view.set(view);
      this.session.update({ name: view.account.name, theme: view.theme });
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.currentPassword.set('');
      this.saved.set(true);
    } catch (e) {
      if (e instanceof ApiError && e.type === 'current-password-invalid') {
        this.failure.set('Your current password isn’t right.');
      } else if (e instanceof ApiError && e.type === 'email-in-use') {
        this.failure.set('That e-mail address is already in use.');
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failure.set('Shelfie couldn’t be reached. Check your connection and try again.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}

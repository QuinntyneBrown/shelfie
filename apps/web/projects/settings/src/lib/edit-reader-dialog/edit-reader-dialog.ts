import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Banner, ColorPicker, Dialog, TextField } from 'components';
import { ApiError } from 'core';
import { ReadersApi } from '../readers-api';
import { ReaderView } from '../settings-api';

const COLORS = ['rose', 'sky', 'sun', 'mint', 'lilac'];
const USERNAME_RULE = /^[A-Za-z0-9._]{3,20}$/;

/** Adds a reader to the household, or edits one; saves through the API and reports the saved reader. */
@Component({
  selector: 'sh-edit-reader-dialog',
  imports: [Banner, ColorPicker, Dialog, TextField],
  templateUrl: './edit-reader-dialog.html',
  styleUrl: './edit-reader-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditReaderDialog {
  private readonly api = inject(ReadersApi);

  readonly open = input(false);
  /** The reader being edited, or null to add one. */
  readonly editing = input<ReaderView | null>(null);
  readonly saved = output<ReaderView>();
  readonly closed = output<void>();

  protected readonly colors = COLORS;
  protected readonly name = signal('');
  protected readonly color = signal('mint');
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly usernameError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly problems = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly heading = computed(() => {
    const reader = this.editing();
    return reader ? `Edit ${reader.name}` : 'Add a reader';
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const reader = this.editing();
      this.name.set(reader?.name ?? '');
      this.color.set(reader?.color ?? 'mint');
      this.username.set(reader?.username ?? '');
      this.password.set('');
      this.nameError.set(null);
      this.usernameError.set(null);
      this.passwordError.set(null);
      this.problems.set([]);
      this.failed.set(false);
    });
  }

  protected async save() {
    if (this.busy()) return;
    this.failed.set(false);
    const name = this.name().trim();
    const password = this.password();
    this.nameError.set(!name ? 'Enter a name.' : name.length > 40 ? 'Use 40 characters or fewer.' : null);
    this.usernameError.set(
      this.username().length < 3 || this.username().length > 20
        ? '3–20 characters.'
        : USERNAME_RULE.test(this.username())
          ? null
          : 'Letters, numbers, . and _ only.',
    );
    this.passwordError.set(
      (this.editing() ? password && password.length < 8 : password.length < 8)
        ? 'At least 8 characters.'
        : null,
    );
    this.summarise();
    if (this.problems().length) return;

    const input = { name, color: this.color(), username: this.username(), ...(password ? { password } : {}) };
    this.busy.set(true);
    try {
      const reader = this.editing();
      this.saved.emit(reader ? await this.api.update(reader.id, input) : await this.api.add(input));
    } catch (e) {
      if (e instanceof ApiError && e.type === 'username-taken') {
        this.usernameError.set('That username is taken.');
        this.problems.set(['Username is taken']);
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failed.set(true);
      }
    } finally {
      this.busy.set(false);
    }
  }

  private summarise() {
    this.problems.set(
      [
        this.nameError() && 'Fix the name',
        this.usernameError() && 'Fix the username',
        this.passwordError() && 'Use 8+ characters',
      ].filter((p): p is string => !!p),
    );
  }
}

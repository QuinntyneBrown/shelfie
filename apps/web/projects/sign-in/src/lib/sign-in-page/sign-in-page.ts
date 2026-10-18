import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button, PinKeypad, ProfileCard, TextField } from 'components';
import { ApiError, SessionService, ThemeService } from 'core';
import { AuthApi, ProfileSummary } from '../auth-api';

@Component({
  selector: 'sh-sign-in-page',
  imports: [Button, PinKeypad, ProfileCard, RouterLink, TextField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  /** Query parameter: 'expired' when the session ran out. */
  readonly reason = input<string>();
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly themes = inject(ThemeService);

  protected readonly profiles = signal<ProfileSummary[]>([]);
  private readonly loaded = signal(false);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly emailError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  /** The reader's PIN step; the grown-up's password step has no keypad. */
  protected readonly pinProfile = computed(() =>
    this.chosen()?.role === 'reader' ? this.chosen() : null,
  );
  // With no device cookie there are no profiles to pick from, so the grown-up types his e-mail.
  protected readonly passwordStep = computed(
    () => this.loaded() && (this.profiles().length === 0 || this.chosen()?.role === 'parent'),
  );
  protected readonly chosen = signal<ProfileSummary | null>(null);
  protected readonly pinError = signal<string | null>(null);
  protected readonly lockedUntil = signal<number | null>(null);
  protected readonly credentialsWrong = signal(false);
  protected readonly tooManyTries = signal(false);
  protected readonly submitting = signal(false);
  protected readonly unreachable = signal(false);
  private readonly keypad = viewChild(PinKeypad);
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  constructor() {
    this.api.profiles().then((profiles) => {
      this.profiles.set(profiles);
      this.loaded.set(true);
    });
  }

  protected async submitPassword() {
    if (this.submitting()) return;
    const email = (this.chosen()?.email ?? this.email()).trim();
    this.emailError.set(
      !email ? 'Enter your e-mail' : !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid e-mail' : null,
    );
    this.passwordError.set(this.password() ? null : 'Enter your password');
    if (this.emailError() || this.passwordError()) return;

    this.credentialsWrong.set(false);
    this.tooManyTries.set(false);
    this.unreachable.set(false);
    this.submitting.set(true);
    try {
      this.session.current.set(await this.api.signInWithPassword(email, this.password()));
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        this.tooManyTries.set(true);
        setTimeout(() => this.summary()?.nativeElement.focus());
        return;
      }
      if (e instanceof ApiError && e.type === 'credentials-invalid') {
        this.credentialsWrong.set(true);
        setTimeout(() => this.summary()?.nativeElement.focus());
        return;
      }
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.unreachable.set(true);
      return;
    } finally {
      this.submitting.set(false);
    }
    await this.router.navigateByUrl('/review');
  }

  protected async submit(pin: string) {
    const profile = this.chosen();
    if (!profile) return;
    this.pinError.set(null);
    try {
      this.session.current.set(await this.api.signInWithPin(profile.id, pin));
    } catch (e) {
      if (e instanceof ApiError && e.type === 'pin-locked') {
        this.lockedUntil.set(Date.parse(String(e.body['lockedUntil'])));
        this.keypad()?.clear();
        return;
      }
      if (!(e instanceof ApiError) || e.type !== 'pin-invalid') throw e;
      const left = Number(e.body['triesLeft']);
      this.pinError.set(`That PIN didn’t match. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
      this.keypad()?.clear();
      return;
    }
    await this.router.navigateByUrl('/shelf');
  }
}

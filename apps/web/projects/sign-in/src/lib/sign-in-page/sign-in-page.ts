import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Button, PinKeypad, ProfileCard, TextField } from 'components';
import { ApiError, SessionService } from 'core';
import { AuthApi, ProfileSummary } from '../auth-api';

@Component({
  selector: 'sh-sign-in-page',
  imports: [Button, PinKeypad, ProfileCard, TextField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly readers = signal<ProfileSummary[]>([]);
  private readonly loaded = signal(false);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly emailError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  // With no device cookie there are no profiles to pick from, so the grown-up types his e-mail.
  protected readonly passwordStep = computed(() => this.loaded() && this.readers().length === 0);
  protected readonly chosen = signal<ProfileSummary | null>(null);
  protected readonly pinError = signal<string | null>(null);
  protected readonly lockedUntil = signal<number | null>(null);
  protected readonly credentialsWrong = signal(false);
  protected readonly submitting = signal(false);
  private readonly keypad = viewChild(PinKeypad);
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  constructor() {
    this.api
      .profiles()
      .then((profiles) => {
        this.readers.set(profiles.filter((p) => p.role === 'reader'));
        this.loaded.set(true);
      });
  }

  protected async submitPassword() {
    if (this.submitting()) return;
    const email = this.email().trim();
    this.emailError.set(!email ? 'Enter your e-mail' : !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid e-mail' : null);
    this.passwordError.set(this.password() ? null : 'Enter your password');
    if (this.emailError() || this.passwordError()) return;

    this.credentialsWrong.set(false);
    this.submitting.set(true);
    try {
      this.session.current.set(await this.api.signInWithPassword(email, this.password()));
    } catch (e) {
      if (!(e instanceof ApiError) || e.type !== 'credentials-invalid') throw e;
      this.credentialsWrong.set(true);
      setTimeout(() => this.summary()?.nativeElement.focus());
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

import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PinKeypad, ProfileCard } from 'components';
import { ApiError, SessionService } from 'core';
import { AuthApi, ProfileSummary } from '../auth-api';

@Component({
  selector: 'sh-sign-in-page',
  imports: [PinKeypad, ProfileCard],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly readers = signal<ProfileSummary[]>([]);
  protected readonly chosen = signal<ProfileSummary | null>(null);
  protected readonly pinError = signal<string | null>(null);
  private readonly keypad = viewChild(PinKeypad);

  constructor() {
    this.api.profiles().then((profiles) => this.readers.set(profiles.filter((p) => p.role === 'reader')));
  }

  protected async submit(pin: string) {
    const profile = this.chosen();
    if (!profile) return;
    this.pinError.set(null);
    try {
      this.session.current.set(await this.api.signInWithPin(profile.id, pin));
    } catch (e) {
      if (!(e instanceof ApiError) || e.type !== 'pin-invalid') throw e;
      const left = Number(e.body['triesLeft']);
      this.pinError.set(`That PIN didn’t match. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
      this.keypad()?.clear();
      return;
    }
    await this.router.navigateByUrl('/shelf');
  }
}

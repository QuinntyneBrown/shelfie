import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PinKeypad, ProfileCard } from 'components';
import { SessionService } from 'core';
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

  constructor() {
    this.api.profiles().then((profiles) => this.readers.set(profiles.filter((p) => p.role === 'reader')));
  }

  protected async submit(pin: string) {
    const profile = this.chosen();
    if (!profile) return;
    this.session.current.set(await this.api.signInWithPin(profile.id, pin));
    await this.router.navigateByUrl('/shelf');
  }
}

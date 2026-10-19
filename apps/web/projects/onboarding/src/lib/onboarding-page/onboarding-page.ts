import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthLayout, StepIndicator } from 'components';
import { SessionService } from 'core';
import { OnboardingApi } from '../onboarding-api';

export type Step = 'welcome' | 'child' | 'sign-in' | 'reward' | 'done';
const STEPS: Step[] = ['welcome', 'child', 'sign-in', 'reward', 'done'];

/** The one-time set-up wizard after sign-up: five full-screen steps under the auth layout, one per URL. */
@Component({
  selector: 'sh-onboarding-page',
  imports: [AuthLayout, RouterLink, StepIndicator],
  templateUrl: './onboarding-page.html',
  styleUrl: './onboarding-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
  private readonly api = inject(OnboardingApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** The step named by the URL; the route without one is the welcome. */
  readonly step = input<Step | undefined>();
  protected readonly current = computed<Step>(() => this.step() ?? 'welcome');
  protected readonly total = STEPS.length;

  constructor() {
    // A household that has finished or skipped the wizard never sees it again, on any device (L2-137).
    if (this.session.current()?.onboarded) void this.router.navigateByUrl('/review');
  }

  protected readonly number = computed(() => STEPS.indexOf(this.current()) + 1);

  /** Skip for now marks the wizard done and opens Review; anything already created stays (L2-138). */
  protected async skip(event: Event) {
    event.preventDefault();
    await this.finish();
  }

  private async finish() {
    await this.api.finish();
    this.session.update({ onboarded: true });
    await this.router.navigateByUrl('/review');
  }
}

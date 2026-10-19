import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private readonly api = inject(ApiClient);

  /** The wizard is finished or skipped for the household; it never shows again on any device. */
  finish() {
    return this.api.post<void>('/settings/onboarded', {});
  }
}

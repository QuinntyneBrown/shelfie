import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ProviderName = 'google' | 'facebook';

/** How each provider is named in "Continue with …". */
export const PROVIDER_NAMES: Record<ProviderName, string> = { google: 'Google', facebook: 'Facebook' };

/** The Google or Facebook brand mark that leads a "Continue with …" button; decorative, the label names the provider. */
@Component({
  selector: 'sh-provider-icon',
  templateUrl: './provider-icon.html',
  styleUrl: './provider-icon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderIcon {
  readonly provider = input.required<ProviderName>();
}

import { PROVIDER_NAMES, ProviderName } from 'components';

export interface ProviderBanner {
  severity: 'info' | 'danger';
  title: string;
  message: string;
}

/** The banner for the `reason` a provider sign-in came back with, naming the provider; null for no or an unknown reason (L2-157). */
export function providerBanner(reason: string | undefined, provider: string | undefined): ProviderBanner | null {
  const name = PROVIDER_NAMES[provider as ProviderName] ?? 'The provider';
  switch (reason) {
    case 'no-email':
      return {
        severity: 'danger',
        title: `${name} didn’t share an e-mail`,
        message: `Shelfie needs a verified e-mail address to find your account. Check your ${name} account, or sign in with your username and password.`,
      };
    case 'reader':
      return {
        severity: 'danger',
        title: 'That e-mail belongs to a reader',
        message: `Readers sign in with their username and password. Only parents can continue with ${name}.`,
      };
    case 'cancelled':
      return { severity: 'info', title: 'You cancelled', message: `Nothing changed. Continue with ${name} again when you’re ready.` };
    case 'failed':
      return { severity: 'danger', title: 'Something went wrong. Try again', message: `${name} didn’t finish signing you in.` };
    case 'too-many':
      return { severity: 'danger', title: 'Too many tries', message: 'Wait 10 minutes and try again.' };
    default:
      return null;
  }
}

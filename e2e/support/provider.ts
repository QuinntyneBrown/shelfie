import { startFakeProvider, type FakeAccount, type FakeProvider } from '../../apps/api/src/oauth-fake.ts';

let provider: FakeProvider;

/** Starts this worker's stand-in for Google and Facebook on 127.0.0.1, a different site from the app's localhost, so cookies cross a real site boundary. */
export async function startProvider() {
  provider = await startFakeProvider('127.0.0.1');
  return provider;
}

/** The next Continue with Google or Facebook consents as this account. */
export function providerAnswers(account: FakeAccount) {
  provider.answer(account);
}

/** The next Continue with … comes back as a cancelled consent screen. */
export function providerCancels() {
  provider.cancel();
}

/** The next Continue with … comes back with a provider error. */
export function providerFails() {
  provider.fail();
}

/** Back to a working provider that vouches for nobody in particular. */
export function resetProvider() {
  provider.answer({ email: 'parent@example.com', name: 'A parent', verified: true });
}

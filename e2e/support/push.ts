import type { Page } from '@playwright/test';
import type { Push, PushPayload, PushTarget } from '../../apps/api/src/push.ts';

export const pushed: { target: PushTarget; payload: PushPayload }[] = [];

/** Stands in for the API's push sender: keeps every message here instead of sending it. */
export const fakePush: Push = {
  publicKey: 'BHB0ZXN0LXB1YmxpYy1rZXktZm9yLXRoZS1lMmUtc3RhY2s',
  async send(target, payload) {
    pushed.push({ target, payload });
    return 'sent';
  },
};

export function clearPushed() {
  pushed.length = 0;
}

export function pushedTo(endpoint: string) {
  return pushed.filter((p) => p.target.endpoint === endpoint).map((p) => p.payload);
}

/**
 * What the browser does when asked for notification permission: `granted` or `denied` from the start, or `default`
 * until asked, when `answer` is what the person chooses.
 */
export interface BrowserPush {
  permission: 'default' | 'granted' | 'denied';
  answer?: 'granted' | 'denied' | 'default';
}

/**
 * Stands in for the browser's push service, which headless Chromium cannot reach: the permission, and the subscription
 * the browser would hold. The service worker, the notification and the page are the real ones. Call before navigating.
 */
export async function givenBrowserPush(page: Page, { permission, answer = 'granted' }: BrowserPush) {
  await page.addInitScript(
    ({ permission, answer }) => {
      const KEY = 'e2e.push.subscription';
      let state = (sessionStorage.getItem('e2e.push.permission') as NotificationPermission | null) ?? permission;
      Object.defineProperty(Notification, 'permission', { get: () => state, configurable: true });
      Notification.requestPermission = async () => {
        state = answer;
        sessionStorage.setItem('e2e.push.permission', state);
        return state;
      };
      const subscription = (endpoint: string) => ({
        endpoint,
        expirationTime: null,
        options: {},
        toJSON: () => ({ endpoint, keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' } }),
        unsubscribe: async () => {
          localStorage.removeItem(KEY);
          return true;
        },
      });
      PushManager.prototype.getSubscription = async () => {
        const endpoint = localStorage.getItem(KEY);
        return endpoint ? (subscription(endpoint) as unknown as PushSubscription) : null;
      };
      PushManager.prototype.subscribe = async () => {
        const endpoint = `https://push.example.com/send/${crypto.randomUUID()}`;
        localStorage.setItem(KEY, endpoint);
        return subscription(endpoint) as unknown as PushSubscription;
      };
    },
    { permission, answer },
  );
}

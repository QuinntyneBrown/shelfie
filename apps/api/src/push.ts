import webpush from 'web-push';

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface Push {
  publicKey: string;
  /** Sends one message; `gone` means the push service no longer knows the subscription (404 or 410). Other failures throw. */
  send(target: PushTarget, payload: PushPayload): Promise<'sent' | 'gone'>;
}

/** Sends through the browser vendors' push services, signed with the VAPID keys; with no keys set, push is off (L2-120). */
export function createPush(env: NodeJS.ProcessEnv = process.env): Push | null {
  const publicKey = env['VAPID_PUBLIC_KEY'];
  const privateKey = env['VAPID_PRIVATE_KEY'];
  if (!publicKey || !privateKey) return null;
  const vapidDetails = { subject: env['VAPID_SUBJECT'] ?? env['APP_URL'] ?? 'mailto:shelfie@localhost', publicKey, privateKey };
  return {
    publicKey,
    async send({ endpoint, p256dh, auth }, payload) {
      try {
        await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, JSON.stringify(payload), { vapidDetails, TTL: 24 * 60 * 60 });
        return 'sent';
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) return 'gone';
        throw error;
      }
    },
  };
}

/** Runs `work` after `delayMs`. The API keeps no queue: a pending call is lost if the process restarts (ADR-0015). Tests pass their own. */
export type Schedule = (work: () => Promise<void>, delayMs: number) => void;

export const inProcess: Schedule = (work, delayMs) => {
  setTimeout(() => void work(), delayMs).unref();
};

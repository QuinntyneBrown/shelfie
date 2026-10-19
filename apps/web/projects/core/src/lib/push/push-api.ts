import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';

export interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

@Injectable({ providedIn: 'root' })
export class PushApi {
  private readonly api = inject(ApiClient);

  /** The server's public key; a 404 `push-off` means it cannot send notifications. */
  key() {
    return this.api.get<{ publicKey: string }>('/push/key');
  }

  save(subscription: PushSubscriptionBody) {
    return this.api.post<void>('/push/subscriptions', subscription);
  }

  remove(endpoint: string) {
    return this.api.delete('/push/subscriptions', { endpoint });
  }
}

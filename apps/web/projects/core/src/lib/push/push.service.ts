import { Injectable, inject, signal } from '@angular/core';
import { PushApi, type PushSubscriptionBody } from './push-api';

/** `null` until `init()` has looked; then what this browser can do about notifications. */
export type DeviceState = 'unsupported' | 'off' | 'on' | 'blocked';

/** Turns notifications on and off for this browser: the permission, the subscription and the server's copy of it. */
@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly api = inject(PushApi);
  readonly state = signal<DeviceState | null>(null);
  private publicKey: string | null = null;

  /** Works out the state: unsupported without server keys or browser support, blocked when denied, on when subscribed. */
  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      this.state.set('unsupported');
      return;
    }
    try {
      this.publicKey = (await this.api.key()).publicKey;
    } catch {
      this.state.set('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      this.state.set('blocked');
      return;
    }
    const subscription = await this.subscription();
    this.state.set(subscription ? 'on' : 'off');
  }

  /** Asks the browser, so call it only from a tap. A failure to store the subscription undoes it and rethrows. */
  async turnOn() {
    if (!this.publicKey) await this.init();
    if (!this.publicKey) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      this.state.set(permission === 'denied' ? 'blocked' : 'off');
      return;
    }
    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(this.publicKey) });
    try {
      await this.api.save(subscription.toJSON() as PushSubscriptionBody);
    } catch (e) {
      await subscription.unsubscribe();
      this.state.set('off');
      throw e;
    }
    this.state.set('on');
  }

  async turnOff() {
    const subscription = await this.subscription();
    this.state.set('off');
    if (!subscription) return;
    const { endpoint } = subscription;
    await subscription.unsubscribe();
    // The server drops a subscription the push service no longer knows, so a failure here loses nothing.
    await this.api.remove(endpoint).catch(() => undefined);
  }

  /** On sign-out: this browser stops hearing for the person leaving. Never throws, so signing out always finishes. */
  async forget() {
    try {
      if (this.state() === 'on' || (await this.subscription())) await this.turnOff();
    } catch {
      // Nothing to do: the server prunes a dead subscription itself.
    }
    this.state.set(null);
  }

  private async subscription() {
    const registration = await navigator.serviceWorker.getRegistration();
    return (await registration?.pushManager.getSubscription()) ?? null;
  }
}

function toBytes(base64url: string) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

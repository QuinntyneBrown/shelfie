import { Injectable, inject, signal } from '@angular/core';
import { BannerService } from '../banner/banner.service';

/** Knows whether the device is online and says so with a banner while it is not. */
@Injectable({ providedIn: 'root' })
export class OfflineQueue {
  private readonly banners = inject(BannerService);
  private offlineBanner: number | null = null;

  readonly online = signal(navigator.onLine);

  constructor() {
    window.addEventListener('offline', () => this.setOnline(false));
    window.addEventListener('online', () => this.setOnline(true));
    if (!navigator.onLine) this.setOnline(false);
  }

  private setOnline(online: boolean) {
    this.online.set(online);
    if (!online && this.offlineBanner === null) {
      this.offlineBanner = this.banners.show({
        severity: 'warning',
        title: 'No internet connection',
        message: 'Showing what we saved earlier. Anything you log is sent when you’re back.',
      });
    } else if (online && this.offlineBanner !== null) {
      this.banners.clear(this.offlineBanner);
      this.offlineBanner = null;
    }
  }
}

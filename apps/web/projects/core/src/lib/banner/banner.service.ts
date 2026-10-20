import { Injectable, signal } from '@angular/core';

export interface BannerMessage {
  id: number;
  severity: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message?: string;
  /** One small button in the banner, such as Send it again. */
  action?: { label: string; run: () => void };
}

/** Banners for conditions that last, such as being offline; they stay until cleared. */
@Injectable({ providedIn: 'root' })
export class BannerService {
  private nextId = 1;
  readonly banners = signal<BannerMessage[]>([]);

  show(banner: Omit<BannerMessage, 'id'>): number {
    const id = this.nextId++;
    this.banners.update((all) => [...all, { ...banner, id }]);
    return id;
  }

  clear(id: number) {
    this.banners.update((all) => all.filter((b) => b.id !== id));
  }
}

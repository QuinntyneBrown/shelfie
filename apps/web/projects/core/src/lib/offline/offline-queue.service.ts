import { Injectable, inject, signal } from '@angular/core';
import { BannerService } from '../banner/banner.service';

export interface PendingChapterLog {
  bookId: string;
  chapterNumber: number;
  body: { readOn: string; answers: { position: number; text: string }[] };
  queuedAt: string;
}

const STORAGE_KEY = 'shelfie.pending-chapter-logs';

/**
 * Knows whether the device is online, says so with a banner while it is not, and keeps chapters
 * logged offline on the device until they can be sent.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueue {
  private readonly banners = inject(BannerService);
  private offlineBanner: number | null = null;

  readonly online = signal(navigator.onLine);
  readonly pending = signal<PendingChapterLog[]>(readPending());

  constructor() {
    window.addEventListener('offline', () => this.setOnline(false));
    window.addEventListener('online', () => this.setOnline(true));
    if (!navigator.onLine) this.setOnline(false);
  }

  enqueue(log: PendingChapterLog) {
    this.pending.update((all) => [...all, log]);
    writePending(this.pending());
  }

  isPending(bookId: string, chapterNumber: number) {
    return this.pending().some((p) => p.bookId === bookId && p.chapterNumber === chapterNumber);
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

function readPending(): PendingChapterLog[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as PendingChapterLog[];
  } catch {
    return [];
  }
}

function writePending(pending: PendingChapterLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Storage full or blocked: the chapter still shows as waiting in this session.
  }
}

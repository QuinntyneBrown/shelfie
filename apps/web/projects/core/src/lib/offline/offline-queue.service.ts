import { Injectable, inject, signal } from '@angular/core';
import { ApiClient, ApiError } from '../api/api-client';
import { BannerService } from '../banner/banner.service';
import { ToastService } from '../toast/toast.service';

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
  private readonly api = inject(ApiClient);
  private readonly toasts = inject(ToastService);
  private replaying = false;
  private offlineBanner: number | null = null;

  readonly online = signal(navigator.onLine);
  readonly pending = signal<PendingChapterLog[]>(readPending());

  constructor() {
    window.addEventListener('offline', () => this.setOnline(false));
    window.addEventListener('online', () => {
      this.setOnline(true);
      this.replay();
    });
    if (!navigator.onLine) this.setOnline(false);
    else if (this.pending().length) this.replay();
  }

  enqueue(log: PendingChapterLog) {
    this.pending.update((all) => [...all, log]);
    writePending(this.pending());
  }

  /**
   * Sends kept chapters in the order they were logged. A 409 means an earlier attempt already
   * reached the server, so it counts as sent. Any other failure stops here to keep the order.
   */
  async replay() {
    if (this.replaying) return;
    this.replaying = true;
    let sent = 0;
    try {
      while (this.pending().length) {
        const next = this.pending()[0];
        try {
          await this.api.post(`/books/${next.bookId}/chapters/${next.chapterNumber}`, next.body);
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 409)) {
            this.toasts.show({
              severity: 'danger',
              title: `Couldn’t send Chapter ${next.chapterNumber}`,
              text: 'It is still saved on this device.',
              action: { label: 'Retry', run: () => this.replay() },
            });
            return;
          }
        }
        this.pending.update((all) => all.slice(1));
        writePending(this.pending());
        this.toasts.show({ title: `Chapter ${next.chapterNumber} saved` });
        sent++;
      }
      if (sent)
        this.toasts.show({ title: 'Back online', text: 'Everything you logged has been sent.' });
    } finally {
      this.replaying = false;
    }
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

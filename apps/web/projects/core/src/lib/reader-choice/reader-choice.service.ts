import { Injectable, signal } from '@angular/core';

/** Where the parent's picked reader is kept on this device. */
const STORAGE_KEY = 'shelfie.reader';

/**
 * The reader a parent's pages are about when the household has more than one (ADR-0019). Picking her on Review,
 * Books or Add a book picks her on the others; the choice stays on this device only.
 */
@Injectable({ providedIn: 'root' })
export class ReaderChoiceService {
  readonly selected = signal<string | null>(read());

  choose(readerId: string | null) {
    this.selected.set(readerId);
    try {
      if (readerId) localStorage.setItem(STORAGE_KEY, readerId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Without storage the choice lasts until the page is reloaded.
    }
  }

  /** `?reader=` for the API, or nothing when no reader has been picked. */
  query() {
    const id = this.selected();
    return id ? `?reader=${encodeURIComponent(id)}` : '';
  }
}

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

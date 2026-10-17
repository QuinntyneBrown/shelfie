import { Injectable } from '@angular/core';

export interface ChapterDraft {
  readOn: string;
  answers: string[];
  savedAt: string;
}

/** Half-written chapter logs, kept on this device only. */
@Injectable({ providedIn: 'root' })
export class DraftStore {
  save(key: string, draft: ChapterDraft) {
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // Storage unavailable or full: a draft is a convenience, so carry on without one.
    }
  }

  load(key: string): ChapterDraft | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as ChapterDraft) : null;
    } catch {
      return null;
    }
  }

  clear(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
  }
}

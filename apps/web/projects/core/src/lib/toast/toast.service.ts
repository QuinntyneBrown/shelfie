import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  title: string;
  text?: string;
  action?: { label: string; run: () => void };
  durationMs: number;
}

/** How long a toast without a special reason to stay lasts. */
const DEFAULT_DURATION_MS = 8000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  show(toast: Omit<ToastMessage, 'id' | 'durationMs'> & { durationMs?: number }) {
    this.toasts.update((all) => [...all, { durationMs: DEFAULT_DURATION_MS, ...toast, id: this.nextId++ }]);
  }

  dismiss(id: number) {
    this.toasts.update((all) => all.filter((t) => t.id !== id));
  }
}

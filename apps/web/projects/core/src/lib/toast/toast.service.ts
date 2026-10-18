import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'warning' | 'danger';

export interface ToastMessage {
  id: number;
  severity: ToastSeverity;
  title: string;
  text?: string;
  action?: { label: string; run: () => void };
  /** Null keeps the toast until it is dismissed. */
  durationMs: number | null;
}

/** How long a toast without a special reason to stay lasts. */
const DEFAULT_DURATION_MS = 8000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);

  /** Shows a toast and returns its id. A danger toast stays until dismissed. */
  show(
    toast: Omit<ToastMessage, 'id' | 'severity' | 'durationMs'> & {
      severity?: ToastSeverity;
      durationMs?: number;
    },
  ): number {
    const severity = toast.severity ?? 'success';
    const durationMs = toast.durationMs ?? (severity === 'danger' ? null : DEFAULT_DURATION_MS);
    const id = this.nextId++;
    this.toasts.update((all) => [...all, { ...toast, severity, durationMs, id }]);
    return id;
  }

  dismiss(id: number) {
    this.toasts.update((all) => all.filter((t) => t.id !== id));
  }
}

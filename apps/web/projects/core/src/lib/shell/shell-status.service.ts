import { Injectable, signal } from '@angular/core';

/** Numbers the shell shows in its bars, reported by the pages whose responses carry them. */
@Injectable({ providedIn: 'root' })
export class ShellStatusService {
  readonly streak = signal<number | null>(null);
}

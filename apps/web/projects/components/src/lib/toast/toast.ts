import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'sh-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(mouseenter)': 'hold(true, false)',
    '(mouseleave)': 'release(true, false)',
    '(focusin)': 'hold(false, true)',
    '(focusout)': 'release(false, true)',
  },
})
export class Toast {
  readonly severity = input<'success' | 'warning' | 'danger'>('success');
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  /** Null keeps the toast until it is dismissed. */
  readonly durationMs = input.required<number | null>();
  readonly action = output<void>();
  readonly dismissed = output<void>();

  private remaining = 0;
  private startedAt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private hovered = false;
  private focused = false;

  constructor() {
    afterNextRender(() => {
      this.remaining = this.durationMs() ?? 0;
      this.run();
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected hold(hover: boolean, focus: boolean) {
    this.hovered ||= hover;
    this.focused ||= focus;
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.remaining -= Date.now() - this.startedAt;
  }

  protected release(hover: boolean, focus: boolean) {
    if (hover) this.hovered = false;
    if (focus) this.focused = false;
    if (!this.hovered && !this.focused && this.timer === undefined) this.run();
  }

  private run() {
    if (this.durationMs() === null) return;
    this.startedAt = Date.now();
    this.timer = setTimeout(() => this.dismissed.emit(), Math.max(0, this.remaining));
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';

/** How long "Copied!" shows before the button reads "Copy code" again. */
const COPIED_MS = 2000;

/** A community's join code (ADR-0020), shown as ABCD-EFGH and spelt out for screen readers, with a Copy code button. */
@Component({
  selector: 'sh-join-code',
  templateUrl: './join-code.html',
  styleUrl: './join-code.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinCode {
  /** The eight characters, as stored. */
  readonly code = input.required<string>();

  protected readonly shown = computed(() => `${this.code().slice(0, 4)}-${this.code().slice(4)}`);
  protected readonly spelt = computed(() => `Join code ${this.code().split('').join(' ')}`);
  protected readonly copied = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected async copy() {
    try {
      await navigator.clipboard.writeText(this.shown());
    } catch {
      // The code stays selectable, so it can still be copied by hand.
      return;
    }
    this.copied.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.copied.set(false), COPIED_MS);
  }
}

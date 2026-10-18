import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * A modal dialog on the native <dialog>: the browser traps focus inside it and puts focus back on the
 * trigger when it closes. Mark the element that should take focus first with `autofocus`.
 */
@Component({
  selector: 'sh-dialog',
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly heading = input.required<string>();
  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly headingId = `sh-dialog-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) dialog.showModal();
      else if (!this.open() && dialog.open) dialog.close();
    });
  }

  /** Escape asks to close; the owner decides by setting `open`. */
  protected cancel(event: Event) {
    event.preventDefault();
    this.closed.emit();
  }
}

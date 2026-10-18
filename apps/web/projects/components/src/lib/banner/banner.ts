import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

@Component({
  selector: 'sh-banner',
  templateUrl: './banner.html',
  styleUrl: './banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Banner {
  readonly severity = input<'info' | 'success' | 'warning' | 'danger'>('success');
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  /** A form summary: marked at the edge and focusable, so a failed submit can announce itself. */
  readonly summary = input(false);

  private readonly alert = viewChild.required<ElementRef<HTMLElement>>('alert');

  focus() {
    this.alert().nativeElement.focus();
  }
}

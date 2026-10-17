import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'sh-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly sticker = input.required<string>();
  readonly title = input.required<string>();
  readonly text = input.required<string>();
}

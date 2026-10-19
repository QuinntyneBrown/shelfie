import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Avatar } from '../avatar/avatar';

export interface PickableReader {
  id: string;
  name: string;
  color: string;
  photo: string | null;
}

let nextId = 0;

/** One chip per reader, led by her avatar; one tap picks one reader (Read together). */
@Component({
  selector: 'sh-reader-picker',
  imports: [Avatar],
  templateUrl: './reader-picker.html',
  styleUrl: './reader-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReaderPicker {
  readonly label = input.required<string>();
  readonly readers = input.required<PickableReader[]>();
  readonly error = input<string | null>(null);
  /** The picked reader's id, or null while nobody is picked. */
  readonly value = model<string | null>(null);

  protected readonly errorId = `sh-reader-picker-${nextId++}-error`;
}

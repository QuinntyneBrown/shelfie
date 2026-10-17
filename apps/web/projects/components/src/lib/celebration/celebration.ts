import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const PIECES = [
  { x: 8, delay: 0, color: 'rose' },
  { x: 20, delay: 0.6, color: 'sun' },
  { x: 33, delay: 1.1, color: 'sky' },
  { x: 47, delay: 0.2, color: 'mint' },
  { x: 58, delay: 0.9, color: 'lilac' },
  { x: 70, delay: 1.4, color: 'peach' },
  { x: 83, delay: 0.4, color: 'sage' },
  { x: 93, delay: 1.0, color: 'rose' },
  { x: 15, delay: 1.8, color: 'sun' },
  { x: 64, delay: 1.6, color: 'sky' },
];

/** A card that rains confetti for a moment; with reduced motion it simply shows its content. */
@Component({
  selector: 'sh-celebration',
  templateUrl: './celebration.html',
  styleUrl: './celebration.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Celebration {
  readonly variant = input<'chapter' | 'book'>('chapter');
  protected readonly pieces = PIECES;
  protected readonly moving = !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

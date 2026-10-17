import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface StickerOption {
  name: string;
  emoji: string;
}

/** The covers' sticker choices and cover colours, shared by the pickers and the add-book form. */
export const STICKERS: StickerOption[] = [
  { name: 'Lion', emoji: '🦁' },
  { name: 'Robot', emoji: '🤖' },
  { name: 'Dog', emoji: '🐕' },
  { name: 'Books', emoji: '📚' },
  { name: 'Spider', emoji: '🕷️' },
  { name: 'Rabbit', emoji: '🐇' },
  { name: 'Wizard', emoji: '🧙' },
  { name: 'Rocket', emoji: '🚀' },
  { name: 'Dragon', emoji: '🐉' },
  { name: 'Tree', emoji: '🌳' },
  { name: 'Elephant', emoji: '🐘' },
  { name: 'Chocolate', emoji: '🍫' },
];
/** The stickers the grown-up gives as feedback on a chapter. */
export const FEEDBACK_STICKERS: (StickerOption & { value: string })[] = [
  { value: 'star', name: 'Star', emoji: '🌟' },
  { value: 'wise-owl', name: 'Wise owl', emoji: '🦉' },
  { value: 'rocket', name: 'Rocket', emoji: '🚀' },
  { value: 'dragon', name: 'Dragon', emoji: '🐉' },
  { value: 'cookie', name: 'Cookie', emoji: '🍪' },
  { value: 'bright-idea', name: 'Bright idea', emoji: '💡' },
];
export const COVER_COLORS = ['sage', 'rose', 'sky', 'sun', 'lilac', 'mint', 'peach'];

let nextGroup = 0;

@Component({
  selector: 'sh-sticker-picker',
  templateUrl: './sticker-picker.html',
  styleUrl: './sticker-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickerPicker {
  readonly label = input.required<string>();
  /** The chosen sticker's emoji. */
  readonly value = model.required<string>();
  protected readonly stickers = STICKERS;
  protected readonly group = `sh-sticker-picker-${nextGroup++}`;
}

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One line of the chapter chat: Olive's speech bubble, or the reader's own bubble holding her answer. */
@Component({
  selector: 'sh-chat-bubble',
  imports: [NgTemplateOutlet],
  templateUrl: './chat-bubble.html',
  styleUrl: './chat-bubble.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatBubble {
  readonly variant = input<'buddy' | 'me'>('buddy');
}

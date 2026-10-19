import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, Segmented, StickerOption, StickerPicker, Textarea } from 'components';
import { ApiError, SessionService, ToastService } from 'core';
import { FeedbackApi } from '../feedback-api';

const MAX_MESSAGE = 1000;

/** The score's faces, from 1 to 5. */
const FACES: StickerOption[] = [
  { value: '1', name: 'Not fun', emoji: '😞' },
  { value: '2', name: 'A bit meh', emoji: '🙁' },
  { value: '3', name: 'Okay', emoji: '😐' },
  { value: '4', name: 'Good', emoji: '🙂' },
  { value: '5', name: 'Love it', emoji: '🤩' },
];

/** "Send feedback": anyone signed in scores Shelfie, says what it is about and writes a message (L2-114 to L2-117). */
@Component({
  selector: 'sh-send-feedback-dialog',
  imports: [Banner, Dialog, Segmented, StickerPicker, Textarea],
  templateUrl: './send-feedback-dialog.html',
  styleUrl: './send-feedback-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendFeedbackDialog {
  private readonly api = inject(FeedbackApi);
  private readonly toasts = inject(ToastService);

  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly faces = FACES;
  protected readonly kinds = [
    { value: 'feel', label: 'How it feels' },
    { value: 'idea', label: 'An idea' },
  ];
  private readonly person = inject(SessionService).current;
  protected readonly reader = computed(() => this.person()?.role === 'reader');
  protected readonly score = signal('');
  protected readonly kind = signal('feel');
  protected readonly message = signal('');
  protected readonly scoreError = signal<string | null>(null);
  protected readonly messageError = signal<string | null>(null);
  protected readonly problems = computed(() => [this.scoreError(), this.messageError()].filter(Boolean).length);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly messageLabel = computed(() =>
    this.kind() === 'idea' ? 'What would make Shelfie better?' : this.reader() ? 'Tell us more' : 'Your message',
  );
  protected readonly messageHelp = computed(() => {
    const left = MAX_MESSAGE - this.message().trim().length;
    return left < 0 ? 'Up to 1,000 characters' : `Up to 1,000 characters · ${left.toLocaleString('en')} left`;
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.score.set('');
      this.kind.set('feel');
      this.message.set('');
      this.scoreError.set(null);
      this.messageError.set(null);
      this.failed.set(false);
    });
  }

  protected async send() {
    if (this.busy()) return;
    this.failed.set(false);
    const message = this.message().trim();
    const over = message.length - MAX_MESSAGE;
    this.scoreError.set(this.score() || message ? null : 'Pick a face or write a message.');
    this.messageError.set(over > 0 ? `Keep it to 1,000 characters (${over.toLocaleString('en')} too many).` : null);
    if (this.problems()) return;

    this.busy.set(true);
    try {
      await this.api.send({ kind: this.kind() as 'feel' | 'idea', score: this.score() ? Number(this.score()) : null, message: message || null });
      this.toasts.show({ title: 'Thanks! We read every note.' });
      this.closed.emit();
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500 && e.status !== 429) throw e;
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}

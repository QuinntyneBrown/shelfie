import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

/** The counter appears once this many characters or fewer are left. */
const COUNTER_FROM = 200;

/** What the answer box says when the microphone fails; typing always works. */
export const MIC_ERROR = 'Shelfie can’t hear you. You can type your answer instead.';

/** The part of the browser's speech recognition this field uses. */
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** The field that is listening now; starting another stops it. */
let listeningField: QuestionField | null = null;

@Component({
  selector: 'sh-question-field',
  templateUrl: './question-field.html',
  styleUrl: './question-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionField {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly number = input.required<number>();
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
  readonly maxlength = input(2000);
  readonly value = model('');

  protected readonly inputId = computed(() => `q${this.number()}`);
  protected readonly charactersLeft = computed(() => this.maxlength() - this.value().length);
  protected readonly showCounter = computed(() => this.charactersLeft() <= COUNTER_FROM);

  /** The microphone button is drawn only where the browser can recognise speech. */
  protected readonly supported = recognitionConstructor() !== undefined;
  protected readonly listening = signal(false);
  protected readonly micError = signal<string | null>(null);
  protected readonly announcement = signal('');
  protected readonly describedBy = computed(() => {
    const ids = [this.error() ? `${this.inputId()}-error` : null, this.micError() ? `${this.inputId()}-mic-error` : null];
    return ids.filter(Boolean).join(' ') || null;
  });

  private recognition: Recognition | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  focus() {
    this.host.nativeElement.querySelector('textarea')?.focus();
  }

  protected edit(event: Event) {
    // Dictated words replace what follows the text she started from, so typing ends the dictation.
    this.stop();
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  protected toggleDictation() {
    if (this.listening()) this.stop();
    else this.start();
  }

  private start() {
    const Recognizer = recognitionConstructor();
    if (!Recognizer) return;
    listeningField?.stop();
    const recognition = new Recognizer();
    const before = this.value();
    const separator = before && !/\s$/.test(before) ? ' ' : '';
    recognition.lang = document.documentElement.lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const words = Array.from(event.results, (result) => result[0].transcript).join('').trim();
      this.value.set((words ? before + separator + words : before).slice(0, this.maxlength()));
    };
    recognition.onerror = () => {
      this.micError.set(MIC_ERROR);
      this.finish();
    };
    recognition.onend = () => this.finish();
    this.recognition = recognition;
    listeningField = this;
    this.micError.set(null);
    this.listening.set(true);
    this.announcement.set('Listening');
    recognition.start();
  }

  private stop() {
    this.recognition?.stop();
    this.finish();
  }

  private finish() {
    if (!this.recognition) return;
    this.recognition = null;
    if (listeningField === this) listeningField = null;
    this.listening.set(false);
    this.announcement.set('Stopped listening');
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Cover, Progress, QuestionField, Segmented, SegmentedOption } from 'components';
import { DraftStore, ToastService } from 'core';
import { ChapterForm, ChaptersApi, LogResult } from '../chapters-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** How long the Undo toast stays up; the API gives the same window. */
const UNDO_TOAST_MS = 10000;

/** How long she pauses before a draft is saved. */
const DRAFT_DELAY_MS = 3000;

@Component({
  selector: 'sh-log-chapter-page',
  imports: [Cover, Progress, QuestionField, RouterLink, Segmented],
  templateUrl: './log-chapter-page.html',
  styleUrl: './log-chapter-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogChapterPage {
  private readonly api = inject(ChaptersApi);
  private readonly drafts = inject(DraftStore);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();
  readonly n = input.required<string>();

  protected readonly form = signal<ChapterForm | null>(null);
  protected readonly answers = signal<string[]>([]);
  protected readonly result = signal<LogResult | null>(null);
  protected readonly submitting = signal(false);
  protected readonly questionOneMissing = signal(false);
  protected readonly dayOptions: SegmentedOption[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'other', label: 'Another day' },
  ];
  protected readonly day = signal('today');
  protected readonly otherDay = signal('');
  protected readonly dayInFuture = signal(false);
  private readonly fields = viewChildren(QuestionField);
  private readonly draftKey = computed(() => `draft:chapter:${this.id()}:${this.n()}`);
  protected readonly chaptersToGo = computed(() => {
    const result = this.result();
    return result ? result.chapterCount - result.chaptersLogged : 0;
  });

  constructor() {
    effect(() => {
      const [id, n] = [this.id(), Number(this.n())];
      this.form.set(null);
      this.result.set(null);
      this.questionOneMissing.set(false);
      this.day.set('today');
      this.otherDay.set('');
      this.dayInFuture.set(false);
      this.api.form(id, n).then((form) => {
        this.answers.set(form.questions.map(() => ''));
        this.restoreDraft(form);
        this.form.set(form);
      });
    });

    effect((onCleanup) => {
      const form = this.form();
      if (!form || this.result()) return;
      const draft = {
        readOn: this.readOn(form),
        answers: this.answers(),
        savedAt: new Date().toISOString(),
      };
      const untouched = draft.readOn === form.today && draft.answers.every((a) => !a);
      if (untouched) return;
      const id = setTimeout(() => this.drafts.save(this.draftKey(), draft), DRAFT_DELAY_MS);
      onCleanup(() => clearTimeout(id));
    });
  }

  protected pickDay(day: string) {
    this.day.set(day);
    this.dayInFuture.set(false);
  }

  private offerUndo(form: ChapterForm, result: LogResult, readOn: string) {
    const left = result.chapterCount - result.chaptersLogged;
    const draftKey = this.draftKey();
    const answers = this.answers();
    this.toasts.show({
      title: `Chapter ${form.chapterNumber} saved`,
      text: `${left} to go. ${form.grownUpName} will read your answers soon.`,
      durationMs: UNDO_TOAST_MS,
      action: {
        label: 'Undo',
        run: async () => {
          await this.api.undo(result.chapterLogId);
          this.drafts.save(draftKey, { readOn, answers, savedAt: new Date().toISOString() });
          this.result.set(null);
          await this.router.navigate([
            '/books',
            form.book.id,
            'chapters',
            form.chapterNumber,
            'log',
          ]);
        },
      },
    });
  }

  private restoreDraft(form: ChapterForm) {
    const draft = this.drafts.load(this.draftKey());
    if (!draft) return;
    this.answers.set(form.questions.map((_, i) => draft.answers[i] ?? ''));
    if (draft.readOn === addDays(form.today, -1)) this.day.set('yesterday');
    else if (draft.readOn !== form.today) {
      this.day.set('other');
      this.otherDay.set(draft.readOn);
    }
  }

  private readOn(form: ChapterForm) {
    if (this.day() === 'yesterday') return addDays(form.today, -1);
    return this.day() === 'other' ? this.otherDay() || form.today : form.today;
  }

  protected focusFirstQuestion() {
    this.fields()[0]?.focus();
  }

  protected setAnswer(index: number, text: string) {
    if (index === 0 && text.trim()) this.questionOneMissing.set(false);
    this.answers.update((answers) => answers.map((a, i) => (i === index ? text : a)));
  }

  protected async submit() {
    const form = this.form();
    if (!form || this.submitting()) return;
    if (!this.answers()[0].trim()) {
      this.questionOneMissing.set(true);
      setTimeout(() => this.focusFirstQuestion());
      return;
    }
    const readOn = this.readOn(form);
    if (readOn > form.today) {
      this.dayInFuture.set(true);
      return;
    }
    this.submitting.set(true);
    try {
      const result = await this.api.log(form.book.id, form.chapterNumber, {
        readOn,
        answers: form.questions.map((q, i) => ({ position: q.position, text: this.answers()[i] })),
      });
      this.drafts.clear(this.draftKey());
      this.result.set(result);
      this.offerUndo(form, result, readOn);
    } finally {
      this.submitting.set(false);
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover, Progress, QuestionField, Segmented, SegmentedOption } from 'components';
import { ChapterForm, ChaptersApi, LogResult } from '../chapters-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

@Component({
  selector: 'sh-log-chapter-page',
  imports: [Cover, Progress, QuestionField, RouterLink, Segmented],
  templateUrl: './log-chapter-page.html',
  styleUrl: './log-chapter-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogChapterPage {
  private readonly api = inject(ChaptersApi);

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
        this.form.set(form);
        this.answers.set(form.questions.map(() => ''));
      });
    });
  }

  protected pickDay(day: string) {
    this.day.set(day);
    this.dayInFuture.set(false);
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
      this.result.set(
        await this.api.log(form.book.id, form.chapterNumber, {
          readOn,
          answers: form.questions.map((q, i) => ({ position: q.position, text: this.answers()[i] })),
        }),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}

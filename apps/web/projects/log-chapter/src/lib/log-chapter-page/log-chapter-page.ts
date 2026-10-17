import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cover, Progress, QuestionField } from 'components';
import { ChapterForm, ChaptersApi, LogResult } from '../chapters-api';

const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'sh-log-chapter-page',
  imports: [Cover, Progress, QuestionField, RouterLink],
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
      this.api.form(id, n).then((form) => {
        this.form.set(form);
        this.answers.set(form.questions.map(() => ''));
      });
    });
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
    this.submitting.set(true);
    try {
      this.result.set(
        await this.api.log(form.book.id, form.chapterNumber, {
          readOn: isoDay(new Date()),
          answers: form.questions.map((q, i) => ({ position: q.position, text: this.answers()[i] })),
        }),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}

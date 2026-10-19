import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Banner, Celebration, ReaderPicker, Segmented, SegmentedOption } from 'components';
import { ApiError } from 'core';
import { SessionKind, TogetherApi, TogetherForm } from '../together-api';

const addDays = (isoDay: string, days: number) => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Read together: who she read with, what they did, how long and when (L2-137). */
@Component({
  selector: 'sh-log-together-page',
  imports: [Banner, Celebration, ReaderPicker, RouterLink, Segmented],
  templateUrl: './log-together-page.html',
  styleUrl: './log-together-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogTogetherPage {
  private readonly api = inject(TogetherApi);

  protected readonly form = signal<TogetherForm | null>(null);
  protected readonly partner = signal<string | null>(null);
  protected readonly kindOptions: SegmentedOption[] = [
    { value: 'read-to', label: 'I read to her' },
    { value: 'helped', label: 'I helped her read' },
    { value: 'read-to-me', label: 'She read to me' },
  ];
  protected readonly kind = signal('read-to');
  protected readonly minuteOptions: SegmentedOption[] = [
    { value: '10', label: '10 minutes' },
    { value: '20', label: '20 minutes' },
    { value: '30', label: '30 minutes' },
    { value: 'other', label: 'Another number' },
  ];
  protected readonly minuteChoice = signal('20');
  protected readonly otherMinutes = signal('');
  protected readonly dayOptions: SegmentedOption[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'other', label: 'Another day' },
  ];
  protected readonly day = signal('today');
  protected readonly otherDay = signal('');

  protected readonly partnerError = signal<string | null>(null);
  protected readonly minutesError = signal<string | null>(null);
  protected readonly dayError = signal<string | null>(null);
  protected readonly problems = computed(() =>
    [this.partnerError(), this.minutesError(), this.dayError()].filter((p): p is string => p !== null),
  );
  protected readonly submitting = signal(false);
  protected readonly failed = signal<'network' | 'limit' | null>(null);
  /** The minutes saved, once the session is logged. */
  protected readonly saved = signal<number | null>(null);

  constructor() {
    this.api.form().then((form) => {
      if (form.partners.length === 1) this.partner.set(form.partners[0].id);
      this.form.set(form);
    });
  }

  protected pickPartner(id: string | null) {
    this.partner.set(id);
    this.partnerError.set(null);
  }

  private minutes() {
    return Number(this.minuteChoice() === 'other' ? this.otherMinutes().trim() || NaN : this.minuteChoice());
  }

  private readOn(form: TogetherForm) {
    if (this.day() === 'yesterday') return addDays(form.today, -1);
    return this.day() === 'other' ? this.otherDay() || form.today : form.today;
  }

  protected async submit() {
    const form = this.form();
    if (!form || this.submitting()) return;
    const minutes = this.minutes();
    const readOn = this.readOn(form);
    this.partnerError.set(this.partner() ? null : 'Pick who you read with.');
    this.minutesError.set(Number.isInteger(minutes) && minutes >= 5 && minutes <= 180 ? null : 'Use 5 to 180 minutes.');
    this.dayError.set(readOn > form.today ? 'Pick today or an earlier day.' : null);
    if (this.problems().length) return;

    this.submitting.set(true);
    this.failed.set(null);
    try {
      await this.api.log({ partnerId: this.partner()!, kind: this.kind() as SessionKind, minutes, readOn });
      this.saved.set(minutes);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.type === 'too-many-sessions') this.failed.set('limit');
      else if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      else this.failed.set('network');
    } finally {
      this.submitting.set(false);
    }
  }
}

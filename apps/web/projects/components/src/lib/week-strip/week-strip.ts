import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface WeekStripDay {
  /** YYYY-MM-DD */
  date: string;
  read: boolean;
  today: boolean;
}

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** This week, Monday to Sunday: the days she read join into one band, and today carries the flame. */
@Component({
  selector: 'sh-week-strip',
  templateUrl: './week-strip.html',
  styleUrl: './week-strip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekStrip {
  readonly days = input.required<WeekStripDay[]>();

  protected readonly cells = computed(() =>
    this.days().map((day) => ({ ...day, letter: NAMES[new Date(`${day.date}T00:00:00Z`).getUTCDay()]![0] })),
  );

  protected readonly label = computed(() => {
    const read = this.days().filter((day) => day.read);
    if (read.length === 0) return 'This week: no reading yet';
    const names = read.map((day) => (day.today ? 'today' : NAMES[new Date(`${day.date}T00:00:00Z`).getUTCDay()]));
    return `This week: read on ${read.length} ${read.length === 1 ? 'day' : 'days'}, ${names.join(', ')}`;
  });
}

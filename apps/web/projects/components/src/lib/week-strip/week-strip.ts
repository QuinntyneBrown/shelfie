import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface WeekStripDay {
  /** YYYY-MM-DD */
  date: string;
  read: boolean;
  /** The activity a parent healed this day with, when she read nothing on it. */
  healed?: string | null;
  today: boolean;
}

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** This week, Monday to Sunday: the days she read join into one band, a healed day joins it marked with a 🩹, and today carries the flame. */
@Component({
  selector: 'sh-week-strip',
  templateUrl: './week-strip.html',
  styleUrl: './week-strip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekStrip {
  readonly days = input.required<WeekStripDay[]>();

  protected readonly cells = computed(() =>
    this.days().map((day) => {
      const name = NAMES[new Date(`${day.date}T00:00:00Z`).getUTCDay()]!;
      return { ...day, name, letter: name[0] };
    }),
  );

  protected readonly healed = computed(() => this.cells().filter((day) => day.healed));

  protected readonly label = computed(() => {
    const read = this.cells().filter((day) => day.read);
    const healed = this.healed().map((day) => ` Healed ${day.name}: ${day.healed}`).join('.');
    if (read.length === 0) return `This week: no reading yet${healed ? '.' + healed : ''}`;
    const names = read.map((day) => (day.today ? 'today' : day.name));
    return `This week: read on ${read.length} ${read.length === 1 ? 'day' : 'days'}, ${names.join(', ')}${healed ? '.' + healed : ''}`;
  });
}

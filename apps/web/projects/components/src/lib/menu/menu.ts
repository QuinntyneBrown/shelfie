import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';

export interface MenuItem {
  id: string;
  label: string;
}

/** A menu button following the WAI-ARIA menu button pattern. The projected content is the trigger's face. */
@Component({
  selector: 'sh-menu',
  templateUrl: './menu.html',
  styleUrl: './menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'closeOnOutsideClick($event)' },
})
export class Menu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly label = input.required<string>();
  readonly triggerClass = input('');
  readonly header = input('');
  readonly items = input.required<MenuItem[]>();
  readonly select = output<string>();

  protected readonly open = signal(false);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly itemButtons = viewChildren<ElementRef<HTMLButtonElement>>('item');

  protected toggle() {
    if (this.open()) this.close();
    else this.show(0);
  }

  protected triggerKey(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.show(0);
    }
  }

  protected menuKey(event: KeyboardEvent) {
    const buttons = this.itemButtons().map((b) => b.nativeElement);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const move: Record<string, number> = {
      ArrowDown: (at + 1) % buttons.length,
      ArrowUp: (at - 1 + buttons.length) % buttons.length,
      Home: 0,
      End: buttons.length - 1,
    };
    if (event.key in move) {
      event.preventDefault();
      buttons[move[event.key]].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Tab') {
      this.open.set(false);
    }
  }

  protected choose(id: string) {
    this.close();
    this.select.emit(id);
  }

  protected closeOnOutsideClick(event: Event) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }

  private show(index: number) {
    this.open.set(true);
    // Focus the item in the same render that creates it, so a key pressed right after opening reaches the menu.
    afterNextRender(() => this.itemButtons()[index]?.nativeElement.focus(), { injector: this.injector });
  }

  private close() {
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }
}

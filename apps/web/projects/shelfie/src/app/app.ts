import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'components';
import { ToastService } from 'core';

@Component({
  imports: [RouterOutlet, Toast],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly toasts = inject(ToastService);

  protected act(id: number, run: () => void) {
    run();
    this.toasts.dismiss(id);
  }
}

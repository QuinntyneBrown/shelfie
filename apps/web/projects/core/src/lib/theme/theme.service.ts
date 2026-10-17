import { Injectable, effect, inject, signal } from '@angular/core';
import { SessionService } from '../session/session.service';

export type Theme = 'device' | 'light' | 'dark';

const STORAGE_KEY = 'shelfie.theme';

/** Draws the app in the household's theme: light, dark, or whatever the device prefers. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly session = inject(SessionService);
  private readonly deviceIsDark = matchMedia('(prefers-color-scheme: dark)');

  readonly theme = signal<Theme>(this.cached());
  readonly resolved = signal<'light' | 'dark'>('light');

  constructor() {
    this.deviceIsDark.addEventListener('change', () => this.render());
    this.render();

    let wasSignedIn = false;
    effect(() => {
      const session = this.session.current();
      if (session) {
        wasSignedIn = true;
        this.apply(session.theme);
      } else if (wasSignedIn) {
        wasSignedIn = false;
        this.apply('device');
      }
    });
  }

  apply(theme: Theme) {
    this.theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage is only a head start for the next page load.
    }
    this.render();
  }

  private render() {
    const resolved =
      this.theme() === 'device'
        ? this.deviceIsDark.matches
          ? 'dark'
          : 'light'
        : (this.theme() as 'light' | 'dark');
    this.resolved.set(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }

  private cached(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'device';
    } catch {
      return 'device';
    }
  }
}

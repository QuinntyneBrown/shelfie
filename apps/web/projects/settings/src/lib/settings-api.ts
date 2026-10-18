import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export type Theme = 'device' | 'light' | 'dark';

export interface SettingsPatch {
  theme: Theme;
  reader: { name: string; color: string; pin?: string };
  grownUp: { name: string; email: string; newPassword?: string; currentPassword?: string };
}

export interface SettingsView {
  theme: Theme;
  reader: { name: string; color: string };
  grownUp: { name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly api = inject(ApiClient);

  save(patch: SettingsPatch) {
    return this.api.patch<SettingsView>('/settings', patch);
  }

  get() {
    return this.api.get<SettingsView>('/settings');
  }
}

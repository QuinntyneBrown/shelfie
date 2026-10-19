import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export type Theme = 'device' | 'light' | 'dark';

export interface ParentView {
  id: string;
  name: string;
  username: string;
  color: string;
  photo: string | null;
}

export interface InviteView {
  id: string;
  email: string;
  sentAt: string;
  expiresAt: string;
}

export interface ReaderView {
  id: string;
  name: string;
  color: string;
  username: string;
  photo: string | null;
}

/** Which events send a push notification, for the whole household. */
export interface NotificationChoices {
  chapterLogged: boolean;
  feedback: boolean;
  bookReward: boolean;
  streakReward: boolean;
}

export interface SettingsPatch {
  theme: Theme;
  notifications: NotificationChoices;
  account: { name: string; email: string; newPassword?: string; currentPassword?: string };
}

export interface SettingsView {
  theme: Theme;
  notifications: NotificationChoices;
  account: { name: string; username: string; email: string };
  parents: ParentView[];
  invites: InviteView[];
  readers: ReaderView[];
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

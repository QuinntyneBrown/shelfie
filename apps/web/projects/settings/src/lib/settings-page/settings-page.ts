import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Avatar, Banner, Button, Dialog, ErrorState, Skeleton, TextField } from 'components';
import { ApiError, SessionService, ToastService } from 'core';
import { EditReaderDialog } from '../edit-reader-dialog/edit-reader-dialog';
import { GalleryRewardDialog } from '../gallery-reward-dialog/gallery-reward-dialog';
import { GalleryReward, GalleryRewardsApi } from '../gallery-rewards-api';
import { InviteParentDialog } from '../invite-parent-dialog/invite-parent-dialog';
import { ProfilePhotoDialog } from '../profile-photo-dialog/profile-photo-dialog';
import { InvitesApi } from '../invites-api';
import { InviteView, ParentView, ReaderView, SettingsApi, SettingsView, Theme } from '../settings-api';

@Component({
  selector: 'sh-settings-page',
  imports: [
    Avatar,
    Banner,
    Button,
    Dialog,
    EditReaderDialog,
    GalleryRewardDialog,
    ErrorState,
    InviteParentDialog,
    ProfilePhotoDialog,
    Skeleton,
    TextField,
  ],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly api = inject(SettingsApi);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly invites = inject(InvitesApi);
  private readonly galleryApi = inject(GalleryRewardsApi);

  protected readonly view = signal<SettingsView | null>(null);
  /** The reward gallery, loaded with the settings. */
  protected readonly rewards = signal<GalleryReward[]>([]);
  protected readonly rewardDialogOpen = signal(false);
  protected readonly editingReward = signal<GalleryReward | null>(null);
  protected readonly removingReward = signal<GalleryReward | null>(null);
  protected readonly removeBusy = signal(false);
  protected readonly removeFailed = signal(false);
  /** Who picks from the gallery, by name. */
  protected readonly readerNames = computed(
    () => this.view()?.readers.map((r) => r.name).join(' and ') || 'Your reader',
  );
  protected readonly loadFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly failure = signal<string | null>(null);
  protected readonly nameError = signal<string | null>(null);
  protected readonly emailError = signal<string | null>(null);
  protected readonly newPasswordError = signal<string | null>(null);
  protected readonly confirmError = signal<string | null>(null);
  protected readonly problems = computed(() =>
    [
      this.nameError() && 'Fix your name',
      this.emailError() && 'E-mail needs an @ and a dot',
      this.newPasswordError() && 'Use 8+ characters',
      this.confirmError() && 'Passwords don’t match',
    ].filter((p): p is string => !!p),
  );
  /** The signed-in parent, whose photo changes in the Your photo dialog. */
  protected readonly me = this.session.current;
  protected readonly photoDialogOpen = signal(false);
  protected readonly inviteDialogOpen = signal(false);
  protected readonly readerDialogOpen = signal(false);
  protected readonly editingReader = signal<ReaderView | null>(null);
  protected readonly theme = signal<Theme>('device');
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly currentPassword = signal('');

  constructor() {
    this.load();
  }

  protected async load() {
    this.loadFailed.set(false);
    this.view.set(null);
    try {
      const [view, rewards] = await Promise.all([this.api.get(), this.galleryApi.list()]);
      this.rewards.set(rewards);
      this.theme.set(view.theme);
      this.name.set(view.account.name);
      this.email.set(view.account.email);
      this.view.set(view);
    } catch {
      this.loadFailed.set(true);
    }
  }

  /** Lists the pending invite, in place of an earlier one to the same address. */
  protected inviteSent(invite: InviteView) {
    const view = this.view()!;
    this.view.set({ ...view, invites: [...view.invites.filter((i) => i.email !== invite.email), invite] });
  }

  protected async sendAgain(invite: InviteView) {
    try {
      this.inviteSent(await this.invites.send(invite.email));
      this.toasts.show({ title: `Invite sent again to ${invite.email}` });
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.toasts.show({ severity: 'danger', title: 'The invite wasn’t sent', text: 'Check your connection and try again.' });
    }
  }

  protected openReaderDialog(reader: ReaderView | null) {
    this.editingReader.set(reader);
    this.readerDialogOpen.set(true);
  }

  /** Puts the saved reader in the list, in place of the one edited or at the end. */
  protected readerSaved(reader: ReaderView) {
    this.readerDialogOpen.set(false);
    const view = this.view()!;
    const edited = this.editingReader();
    const readers = edited
      ? view.readers.map((r) => (r.id === reader.id ? reader : r))
      : [...view.readers, reader];
    this.view.set({ ...view, readers });
    this.toasts.show({ title: edited ? `${reader.name} saved` : `${reader.name} added` });
  }

  protected openRewardDialog(reward: GalleryReward | null) {
    this.editingReward.set(reward);
    this.rewardDialogOpen.set(true);
  }

  /** Puts the saved reward in the list, in place of the one edited or at the end. */
  protected rewardSaved(reward: GalleryReward) {
    this.rewardDialogOpen.set(false);
    const edited = this.editingReward();
    this.rewards.update((rewards) =>
      edited ? rewards.map((r) => (r.id === reward.id ? reward : r)) : [...rewards, reward],
    );
    this.toasts.show({ title: edited ? `${reward.name} saved` : `${reward.name} added` });
  }

  protected openRemoveReward(reward: GalleryReward) {
    this.removeFailed.set(false);
    this.removingReward.set(reward);
  }

  protected async removeReward() {
    const reward = this.removingReward();
    if (!reward || this.removeBusy()) return;
    this.removeBusy.set(true);
    this.removeFailed.set(false);
    try {
      await this.galleryApi.remove(reward.id);
      this.rewards.update((rewards) => rewards.filter((r) => r.id !== reward.id));
      this.removingReward.set(null);
      this.toasts.show({ title: `${reward.name} removed` });
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.removeFailed.set(true);
    } finally {
      this.removeBusy.set(false);
    }
  }

  /** A parent's photo; your own comes from the session, so a change shows at once. */
  protected photoOf(parent: ParentView) {
    const me = this.me();
    return parent.id === me?.profileId ? me.photo : parent.photo;
  }

  protected async signOut() {
    await this.session.signOut();
    await this.router.navigateByUrl('/sign-in');
  }

  protected async save() {
    if (this.saving()) return;
    const name = this.name().trim();
    this.nameError.set(!name ? 'Enter a name.' : name.length > 40 ? 'Use 40 characters or fewer.' : null);
    this.emailError.set(
      /^\S+@\S+\.\S+$/.test(this.email().trim())
        ? null
        : 'Enter an e-mail address like name@example.com.',
    );
    const newPassword = this.newPassword();
    this.newPasswordError.set(
      newPassword && newPassword.length < 8 ? 'Use at least 8 characters.' : null,
    );
    this.confirmError.set(
      newPassword !== this.confirmPassword()
        ? 'These don’t match. Type the same password in both boxes.'
        : null,
    );
    if (this.problems().length) return;
    this.saving.set(true);
    this.saved.set(false);
    this.failure.set(null);
    try {
      const view = await this.api.save({
        theme: this.theme(),
        account: {
          name,
          email: this.email().trim(),
          ...(newPassword ? { newPassword } : {}),
          ...(this.currentPassword() ? { currentPassword: this.currentPassword() } : {}),
        },
      });
      this.view.set(view);
      this.session.update({ name: view.account.name, theme: view.theme });
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.currentPassword.set('');
      this.saved.set(true);
    } catch (e) {
      if (e instanceof ApiError && e.type === 'current-password-invalid') {
        this.failure.set('Your current password isn’t right.');
      } else if (e instanceof ApiError && e.type === 'email-in-use') {
        this.failure.set('That e-mail address is already in use.');
      } else if (e instanceof ApiError && e.status > 0 && e.status < 500) {
        throw e;
      } else {
        this.failure.set('Shelfie couldn’t be reached. Check your connection and try again.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  Banner,
  Button,
  ErrorState,
  PHOTO_ERRORS,
  PhotoPicker,
  Skeleton,
  TextField,
  Textarea,
} from 'components';
import { ApiError, SessionService, ToastService } from 'core';
import { MeApi, MyProfile } from '../me-api';

type Field = 'name' | 'bio' | 'website' | 'ages' | 'contact';

const STATUS_BANNERS = {
  pending: {
    severity: 'info',
    title: 'Waiting for approval',
    message:
      'Parents can’t see your profile yet. Shelfie checks every new profile before it is listed; you can keep editing in the meantime.',
  },
  approved: {
    severity: 'success',
    title: 'Parents can see your profile',
    message: 'It is listed in Shelfie’s directory for parents.',
  },
  hidden: {
    severity: 'warning',
    title: 'Hidden by Shelfie',
    message:
      'Parents can’t see your profile right now. If you think this is a mistake, write to hello@shelfie.kids.',
  },
} as const;

/** An author's or volunteer's own profile, as parents will see it in the directory (L2-155 to L2-157). */
@Component({
  selector: 'sh-my-profile-page',
  imports: [Banner, Button, ErrorState, PhotoPicker, Skeleton, TextField, Textarea],
  templateUrl: './my-profile-page.html',
  styleUrl: './my-profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfilePage {
  private readonly api = inject(MeApi);
  protected readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);

  protected readonly profile = signal<MyProfile | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly banner = computed(() => {
    const profile = this.profile();
    return profile ? STATUS_BANNERS[profile.status] : null;
  });
  protected readonly author = computed(() => this.profile()?.role === 'author');

  protected readonly name = signal('');
  protected readonly bio = signal('');
  protected readonly website = signal('');
  protected readonly ages = signal('');
  protected readonly contact = signal('');
  protected readonly errors = signal<Partial<Record<Field, string>>>({});
  protected readonly problems = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly saveFailed = signal(false);
  private readonly summary = viewChild<Banner>('summary');

  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<string | null>(null);
  protected readonly photoFailed = signal(false);

  constructor() {
    this.load();
  }

  protected async load() {
    this.loadFailed.set(false);
    try {
      const profile = await this.api.profile();
      this.profile.set(profile);
      this.name.set(profile.name);
      this.bio.set(profile.bio);
      this.website.set(profile.website ?? '');
      this.ages.set(profile.ages ?? '');
      this.contact.set(profile.contact ?? '');
    } catch {
      this.loadFailed.set(true);
    }
  }

  protected async save() {
    if (this.saving()) return;
    this.saveFailed.set(false);
    const name = this.name().trim();
    const bio = this.bio().trim();
    const website = this.website().trim();
    const errors: Partial<Record<Field, string>> = {};
    if (!name) errors.name = 'Enter your name as parents will see it.';
    if (!bio) errors.bio = 'Tell parents a little about yourself.';
    if (this.author()) {
      if (website && !/^https?:\/\/\S+$/.test(website))
        errors.website = 'Enter a full web address starting with https://';
    } else {
      if (!this.ages().trim()) errors.ages = 'Say which ages you help with.';
      if (!this.contact().trim()) errors.contact = 'Say how parents can reach you.';
    }
    this.errors.set(errors);
    const lines: Record<Field, string> = {
      name: 'Add your name',
      bio: 'Write about yourself',
      website: 'Fix the website',
      ages: 'Add the ages you help with',
      contact: 'Add how parents can reach you',
    };
    this.problems.set(
      (Object.keys(lines) as Field[]).filter((f) => errors[f]).map((f) => lines[f]),
    );
    if (this.problems().length) {
      setTimeout(() => this.summary()?.focus());
      return;
    }

    this.saving.set(true);
    try {
      const saved = await this.api.save(
        this.author()
          ? { name, bio, website: website || null }
          : { name, bio, ages: this.ages().trim(), contact: this.contact().trim() },
      );
      this.profile.set(saved);
      this.session.update({ name: saved.name });
      this.toasts.show({
        title: 'Profile saved',
        text: 'Parents see the change next time they open it.',
      });
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      this.saveFailed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  /** Uploads a chosen photo at once, as the Your photo dialog does (L2-156). */
  protected async upload(file: File) {
    await this.changePhoto(async () => (await this.api.uploadPhoto(file)).photo);
  }

  protected async removePhoto() {
    await this.changePhoto(async () => {
      await this.api.removePhoto();
      return null;
    });
  }

  private async changePhoto(work: () => Promise<string | null>) {
    if (this.photoBusy()) return;
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.photoFailed.set(false);
    try {
      const photo = await work();
      this.profile.update((profile) => (profile ? { ...profile, photo } : profile));
      this.session.update({ photo });
    } catch (e) {
      if (e instanceof ApiError && e.type === 'photo-type') this.photoError.set(PHOTO_ERRORS.type);
      else if (e instanceof ApiError && e.type === 'photo-too-large')
        this.photoError.set(PHOTO_ERRORS.size);
      else if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      else this.photoFailed.set(true);
    } finally {
      this.photoBusy.set(false);
    }
  }
}

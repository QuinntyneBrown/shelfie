import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Banner, Dialog, PHOTO_ERRORS, PhotoPicker } from 'components';
import { ApiError, SessionService } from 'core';
import { ProfilePhotoApi } from '../profile-photo-api';

/** "Your photo": the signed-in parent or reader chooses, replaces or removes their own photo. */
@Component({
  selector: 'sh-profile-photo-dialog',
  imports: [Banner, Dialog, PhotoPicker],
  templateUrl: './profile-photo-dialog.html',
  styleUrl: './profile-photo-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePhotoDialog {
  private readonly api = inject(ProfilePhotoApi);
  private readonly session = inject(SessionService);

  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly person = this.session.current;
  protected readonly busy = signal(false);
  protected readonly uploaded = signal(false);
  /** The picker's error when the server refuses the file. */
  protected readonly error = signal<string | null>(null);
  /** The heading of the failure banner, and what Try again repeats. */
  protected readonly failure = signal<{ title: string; retry: () => void } | null>(null);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.uploaded.set(false);
      this.error.set(null);
      this.failure.set(null);
    });
  }

  protected async upload(file: File) {
    const done = await this.run({ title: 'Your photo didn’t upload', retry: () => this.upload(file) }, async () => {
      const { photo } = await this.api.upload(file);
      this.session.update({ photo });
    });
    this.uploaded.set(done);
  }

  /** Runs one request with the busy state; says whether it worked. */
  private async run(failure: { title: string; retry: () => void }, work: () => Promise<void>) {
    if (this.busy()) return false;
    this.busy.set(true);
    this.uploaded.set(false);
    this.error.set(null);
    this.failure.set(null);
    try {
      await work();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.type === 'photo-type') this.error.set(PHOTO_ERRORS.type);
      else if (e instanceof ApiError && e.type === 'photo-too-large') this.error.set(PHOTO_ERRORS.size);
      else if (e instanceof ApiError && e.status > 0 && e.status < 500) throw e;
      else this.failure.set(failure);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}

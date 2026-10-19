import { ChangeDetectionStrategy, Component } from '@angular/core';

/** An author's or volunteer's own profile, as parents will see it in the directory. */
@Component({
  selector: 'sh-my-profile-page',
  templateUrl: './my-profile-page.html',
  styleUrl: './my-profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfilePage {}

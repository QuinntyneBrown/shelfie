import { Injectable, inject } from '@angular/core';
import { ApiClient } from 'core';

export interface AuthorRow {
  id: string;
  name: string;
  color: string;
  photo: string | null;
  bio: string;
  bookCount: number;
}

export interface VolunteerRow {
  id: string;
  name: string;
  color: string;
  photo: string | null;
  bio: string;
  ages: string;
}

export interface DirectoryList {
  authors: AuthorRow[];
  volunteers: VolunteerRow[];
}

export interface DirectoryBook {
  id: string;
  title: string;
  chapterCount: number;
  description: string;
  coverImage: string | null;
}

export interface AuthorView {
  id: string;
  name: string;
  color: string;
  photo: string | null;
  bio: string;
  website: string | null;
  books: DirectoryBook[];
}

export interface VolunteerView {
  id: string;
  name: string;
  color: string;
  photo: string | null;
  bio: string;
  ages: string;
  contact: string;
}

/** The parent's reading of the directory: approved authors and volunteers only. */
@Injectable({ providedIn: 'root' })
export class DirectoryApi {
  private readonly api = inject(ApiClient);

  list() {
    return this.api.get<DirectoryList>('/directory');
  }

  volunteer(id: string) {
    return this.api.get<VolunteerView>(`/directory/volunteers/${encodeURIComponent(id)}`);
  }

  author(id: string) {
    return this.api.get<AuthorView>(`/directory/authors/${encodeURIComponent(id)}`);
  }
}

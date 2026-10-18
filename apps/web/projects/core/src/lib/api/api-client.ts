import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    readonly body: Record<string, unknown>,
  ) {
    super(`${status} ${type}`);
  }
}

/** Sent with every request; the API refuses state changes that lack it. */
const HEADERS = { 'X-Requested-With': 'Shelfie' };

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(path: string): Promise<T> {
    return this.send(this.http.get<T>(`/api${path}`, { headers: HEADERS }));
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.post<T>(`/api${path}`, body, { headers: HEADERS }));
  }

  /** A `File` or `Blob` body is sent as it is, with its own content type. */
  put<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.put<T>(`/api${path}`, body, { headers: HEADERS }));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.patch<T>(`/api${path}`, body, { headers: HEADERS }));
  }

  delete(path: string): Promise<void> {
    return this.send(this.http.delete<void>(`/api${path}`, { headers: HEADERS }));
  }

  private async send<T>(request: Observable<unknown>): Promise<T> {
    try {
      return (await firstValueFrom(request)) as T;
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        const body = (e.error ?? {}) as Record<string, unknown>;
        throw new ApiError(e.status, String(body['type'] ?? 'unknown'), body);
      }
      throw e;
    }
  }
}

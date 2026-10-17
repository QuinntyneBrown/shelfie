import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    readonly body: Record<string, unknown>,
  ) {
    super(`${status} ${type}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(path: string): Promise<T> {
    return this.send(this.http.get<T>(`/api${path}`));
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.post<T>(`/api${path}`, body));
  }

  private async send<T>(request: ReturnType<HttpClient['get']> | ReturnType<HttpClient['post']>): Promise<T> {
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

import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { N8N_CONFIG } from './n8n.config';

/**
 * Why a webhook call failed, so pages can show the right message:
 * - unavailable: not in the browser, or n8n is not configured for this tenant
 * - timeout / network: n8n did not answer
 * - rejected: n8n answered 4xx (for example a wrong invite code)
 * - server: n8n answered 5xx (the workflow failed or is not published)
 * - invalid-response: n8n answered, but not with what the contract promises
 */
export type N8nErrorKind =
  'unavailable' | 'timeout' | 'network' | 'rejected' | 'server' | 'invalid-response';

export class N8nError extends Error {
  constructor(
    readonly kind: N8nErrorKind,
    readonly status?: number,
  ) {
    super(`n8n webhook call failed: ${kind}${status ? ` (HTTP ${status})` : ''}`);
    this.name = 'N8nError';
  }
}

/**
 * The one place the site talks to n8n webhooks. Feature services (chat, connections, forms)
 * build on it instead of calling HttpClient with hard-coded URLs.
 * Privacy: request and response bodies are never logged.
 */
@Injectable({ providedIn: 'root' })
export class N8nWebhookClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(N8N_CONFIG);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  isConfigured(): boolean {
    return this.config.webhookBaseUrl !== '';
  }

  /** Full URL of a production webhook path, e.g. `connections/start`. */
  url(path: string): string {
    return `${this.config.webhookBaseUrl}/webhook/${path.replace(/^\/+/, '')}`;
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    if (!this.browser || !this.isConfigured()) {
      throw new N8nError('unavailable');
    }
    try {
      return await firstValueFrom(
        this.http.post<T>(this.url(path), body).pipe(timeout(this.config.timeoutMs)),
      );
    } catch (error) {
      throw toN8nError(error);
    }
  }
}

export function toN8nError(error: unknown): N8nError {
  if (error instanceof N8nError) {
    return error;
  }
  if (error instanceof TimeoutError) {
    return new N8nError('timeout');
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new N8nError('network');
    }
    return new N8nError(error.status < 500 ? 'rejected' : 'server', error.status);
  }
  return new N8nError('network');
}

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, isDevMode, PLATFORM_ID } from '@angular/core';
import { TenantService } from '../tenant/tenant.service';

export interface N8nConfig {
  /** Base URL in front of `/webhook/...`, without a trailing slash. Empty = n8n not configured. */
  webhookBaseUrl: string;
  /** Give up on a webhook call after this many milliseconds. */
  timeoutMs: number;
}

export const N8N_DEFAULT_TIMEOUT_MS = 20_000;

/** n8n settings for this tenant, read from `automation` in tenant.json. Override in tests. */
export const N8N_CONFIG = new InjectionToken<N8nConfig>('N8N_CONFIG', {
  providedIn: 'root',
  factory: () => {
    const automation = inject(TenantService).config().automation;
    const document = inject(DOCUMENT);
    const useLocalProxy =
      isDevMode() &&
      isPlatformBrowser(inject(PLATFORM_ID)) &&
      ['localhost', '127.0.0.1'].includes(document.location.hostname);
    const configuredBase = automation?.webhookBaseUrl ?? automation?.n8nBaseUrl ?? '';
    const base = useLocalProxy ? document.location.origin : configuredBase;
    return { webhookBaseUrl: base.replace(/\/+$/, ''), timeoutMs: N8N_DEFAULT_TIMEOUT_MS };
  },
});

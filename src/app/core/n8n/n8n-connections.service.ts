import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { I18nService } from '../i18n/i18n.service';
import { ConnectionProvider, ConnectionProviderId, findProvider } from './connection-providers';
import { N8nError, N8nWebhookClient } from './n8n-webhook.client';

/** n8n webhook paths. The contract is described in docs/n8n-connections.md. */
export const CONNECTIONS_WEBHOOKS = {
  start: 'connections/start',
} as const;

/** Invite codes the agency hands out: letters, digits and dashes, 6–64 characters. */
export const INVITE_CODE_PATTERN = /^[A-Za-z0-9-]{6,64}$/;

/** Reasons n8n may report when sending the customer back; anything else becomes `failed`. */
export const CONNECTION_FAILURE_REASONS = ['denied', 'expired', 'failed'] as const;
export type ConnectionFailureReason = (typeof CONNECTION_FAILURE_REASONS)[number];

export type ConnectionResult =
  | { status: 'connected'; provider: ConnectionProviderId }
  | { status: 'error'; provider: ConnectionProviderId; reason: ConnectionFailureReason };

interface StartResponse {
  authUrl?: unknown;
}

/**
 * One-click account connections through n8n (OAuth with the agency's own app):
 * 1. `start()` asks n8n for the provider's sign-in URL (n8n holds the client secret).
 * 2. The page sends the browser there; the customer signs in and approves.
 * 3. n8n's callback stores the credential and redirects back to `returnUrl` with
 *    `?status=connected|error&provider=<id>[&reason=<reason>]`, read by `readResult()`.
 */
@Injectable({ providedIn: 'root' })
export class N8nConnectionsService {
  private readonly webhooks = inject(N8nWebhookClient);
  private readonly i18n = inject(I18nService);
  private readonly document = inject(DOCUMENT);

  /** Returns the provider sign-in URL to send the browser to. Throws N8nError. */
  async start(provider: ConnectionProvider, inviteCode: string): Promise<string> {
    const lang = this.i18n.lang();
    const response = await this.webhooks.post<StartResponse>(CONNECTIONS_WEBHOOKS.start, {
      provider: provider.id,
      inviteCode: inviteCode.trim(),
      lang,
      returnUrl: `${this.document.location.origin}/${lang}/integrations`,
    });
    return checkedAuthUrl(response?.authUrl, provider);
  }

  /** Reads the result n8n put on the return URL, or null when there is none. */
  readResult(params: ParamMap): ConnectionResult | null {
    return parseConnectionResult(params);
  }
}

/** Parses `?status=connected|error&provider=<id>[&reason=<reason>]`; unknown values are ignored. */
export function parseConnectionResult(params: ParamMap): ConnectionResult | null {
  const provider = findProvider(params.get('provider'));
  const status = params.get('status');
  if (!provider || (status !== 'connected' && status !== 'error')) {
    return null;
  }
  if (status === 'connected') {
    return { status, provider: provider.id };
  }
  const reason = params.get('reason');
  return {
    status,
    provider: provider.id,
    reason: CONNECTION_FAILURE_REASONS.find((known) => known === reason) ?? 'failed',
  };
}

/** Only https URLs on the provider's own sign-in host are accepted. */
export function checkedAuthUrl(value: unknown, provider: ConnectionProvider): string {
  if (typeof value !== 'string') {
    throw new N8nError('invalid-response');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new N8nError('invalid-response');
  }
  if (url.protocol !== 'https:' || !provider.authHosts.includes(url.hostname)) {
    throw new N8nError('invalid-response');
  }
  return url.toString();
}

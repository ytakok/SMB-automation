import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CONNECTION_PROVIDERS, findProvider } from './connection-providers';
import {
  checkedAuthUrl,
  INVITE_CODE_PATTERN,
  N8nConnectionsService,
} from './n8n-connections.service';
import { N8nError, N8nWebhookClient } from './n8n-webhook.client';

const google = findProvider('google')!;

describe('N8nConnectionsService', () => {
  function setup(
    response: unknown = { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' },
  ) {
    const post = vi.fn().mockResolvedValue(response);
    TestBed.configureTestingModule({
      providers: [provideTranslateService(), { provide: N8nWebhookClient, useValue: { post } }],
    });
    return { service: TestBed.inject(N8nConnectionsService), post };
  }

  it('asks n8n to start the sign-in with the trimmed code and a same-site return URL', async () => {
    const { service, post } = setup();

    const authUrl = await service.start(google, '  ACME-7F3K ');

    expect(authUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth?x=1');
    expect(post).toHaveBeenCalledWith('connections/start', {
      provider: 'google',
      inviteCode: 'ACME-7F3K',
      lang: 'en',
      returnUrl: `${location.origin}/en/integrations`,
    });
  });

  it('refuses sign-in URLs that are not on the provider host', async () => {
    const { service } = setup({ authUrl: 'https://accounts.google.com.evil.test/login' });
    await expect(service.start(google, 'ACME-7F3K')).rejects.toMatchObject({
      kind: 'invalid-response',
    });

    expect(() => checkedAuthUrl('http://accounts.google.com/x', google)).toThrow(N8nError);
    expect(() => checkedAuthUrl('not a url', google)).toThrow(N8nError);
    expect(() => checkedAuthUrl(undefined, google)).toThrow(N8nError);
  });

  it('reads the result n8n puts on the return URL', () => {
    const { service } = setup();
    const read = (params: Record<string, string>) => service.readResult(convertToParamMap(params));

    expect(read({ status: 'connected', provider: 'google' })).toEqual({
      status: 'connected',
      provider: 'google',
    });
    expect(read({ status: 'error', provider: 'microsoft', reason: 'denied' })).toEqual({
      status: 'error',
      provider: 'microsoft',
      reason: 'denied',
    });
    expect(read({ status: 'error', provider: 'google', reason: '<script>' })).toMatchObject({
      reason: 'failed',
    });
    expect(read({ status: 'connected', provider: 'dropbox' })).toBeNull();
    expect(read({})).toBeNull();
  });

  it('accepts only simple invite codes', () => {
    expect(INVITE_CODE_PATTERN.test('ACME-7F3K')).toBe(true);
    expect(INVITE_CODE_PATTERN.test('abc')).toBe(false);
    expect(INVITE_CODE_PATTERN.test('ACME 7F3K')).toBe(false);
  });

  it('lists only https revoke pages', () => {
    for (const provider of CONNECTION_PROVIDERS) {
      expect(provider.revokeUrl.startsWith('https://')).toBe(true);
      expect(provider.authHosts.length).toBeGreaterThan(0);
    }
  });
});

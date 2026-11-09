import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { N8N_CONFIG } from './n8n.config';
import { N8nError, N8nWebhookClient } from './n8n-webhook.client';

describe('N8nWebhookClient', () => {
  function setup(options: { platform?: string; base?: string; timeoutMs?: number } = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
        {
          provide: N8N_CONFIG,
          useValue: {
            webhookBaseUrl: options.base ?? 'https://hooks.test',
            timeoutMs: options.timeoutMs ?? 1000,
          },
        },
      ],
    });
    return {
      client: TestBed.inject(N8nWebhookClient),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('builds production webhook URLs', () => {
    const { client } = setup();
    expect(client.url('/connections/start')).toBe('https://hooks.test/webhook/connections/start');
  });

  it('posts the body and returns the response', async () => {
    const { client, http } = setup();

    const pending = client.post<{ ok: boolean }>('connections/start', { provider: 'google' });
    const request = http.expectOne('https://hooks.test/webhook/connections/start');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ provider: 'google' });
    request.flush({ ok: true });

    await expect(pending).resolves.toEqual({ ok: true });
  });

  it.each([
    [403, 'rejected'],
    [500, 'server'],
    [0, 'network'],
  ])('maps HTTP %s to %s', async (status, kind) => {
    const { client, http } = setup();

    const pending = client.post('x', {});
    http
      .expectOne('https://hooks.test/webhook/x')
      .flush(null, { status, statusText: status ? 'Error' : 'Unknown Error' });

    await expect(pending).rejects.toMatchObject({ name: 'N8nError', kind });
  });

  it('times out when n8n does not answer', async () => {
    vi.useFakeTimers();
    try {
      const { client } = setup({ timeoutMs: 50 });
      const pending = client.post('slow', {});
      const assertion = expect(pending).rejects.toMatchObject({ kind: 'timeout' });
      await vi.advanceTimersByTimeAsync(60);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('never calls n8n during prerendering or when not configured', async () => {
    const server = setup({ platform: 'server' });
    await expect(server.client.post('x', {})).rejects.toBeInstanceOf(N8nError);
    server.http.verify();

    TestBed.resetTestingModule();
    const unconfigured = setup({ base: '' });
    expect(unconfigured.client.isConfigured()).toBe(false);
    await expect(unconfigured.client.post('x', {})).rejects.toMatchObject({ kind: 'unavailable' });
    unconfigured.http.verify();
  });
});

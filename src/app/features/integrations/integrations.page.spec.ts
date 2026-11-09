import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ErrorLogService } from '../../core/logging/error-log.service';
import { CONNECTION_PROVIDERS } from '../../core/n8n/connection-providers';
import { ExternalNavigation } from '../../core/n8n/external-navigation';
import {
  N8nConnectionsService,
  parseConnectionResult,
} from '../../core/n8n/n8n-connections.service';
import { N8nError } from '../../core/n8n/n8n-webhook.client';
import { IntegrationsPage } from './integrations.page';

async function setup(query: Record<string, string> = {}) {
  const start = vi.fn().mockResolvedValue('https://accounts.google.com/o/oauth2/v2/auth');
  const go = vi.fn();
  const log = vi.fn();
  await TestBed.configureTestingModule({
    imports: [IntegrationsPage],
    providers: [
      provideRouter([]),
      provideTranslateService(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
      },
      {
        provide: N8nConnectionsService,
        useValue: { start, readResult: parseConnectionResult },
      },
      { provide: ExternalNavigation, useValue: { go } },
      { provide: ErrorLogService, useValue: { log } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(IntegrationsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const button = (id: string) =>
    element.querySelector<HTMLButtonElement>(
      `section[aria-labelledby="integrations-${id}-title"] button`,
    )!;
  return { fixture, element, start, go, log, button };
}

describe('IntegrationsPage', () => {
  it('renders one heading and a card per provider', async () => {
    const { element } = await setup();

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelectorAll('section.provider')).toHaveLength(CONNECTION_PROVIDERS.length);
    expect(element.querySelector('label[for="integrations-code"]')).toBeTruthy();
    expect(element.querySelector('.help a')!.getAttribute('href')).toBe('/en/contact');
  });

  it('prefills the invite code from the link and sends the browser to the sign-in page', async () => {
    const { fixture, button, start, go } = await setup({ code: 'ACME-7F3K' });

    button('google').click();
    await fixture.whenStable();

    expect(start).toHaveBeenCalledWith(expect.objectContaining({ id: 'google' }), 'ACME-7F3K');
    expect(go).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('asks for the invite code before connecting', async () => {
    const { fixture, element, button, start } = await setup();

    button('google').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = element.querySelector<HTMLInputElement>('#integrations-code')!;
    expect(start).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#integrations-code-error')!.textContent).toContain(
      'integrations.code.errors.required',
    );
    expect(document.activeElement).toBe(input);
  });

  it('explains a rejected invite code without logging it as an error', async () => {
    const { fixture, element, button, start, go, log } = await setup({ code: 'WRONG-CODE' });
    start.mockRejectedValueOnce(new N8nError('rejected', 403));

    button('google').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(go).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'integrations.errors.rejected',
    );
    expect(button('google').disabled).toBe(false);
  });

  it('logs unexpected failures and shows a friendly message', async () => {
    const { fixture, element, button, start, log } = await setup({ code: 'ACME-7F3K' });
    start.mockRejectedValueOnce(new N8nError('server', 500));

    button('microsoft').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(log).toHaveBeenCalledWith(expect.any(N8nError), {
      source: 'manual',
      extra: { feature: 'integrations', kind: 'server' },
    });
    expect(element.textContent).toContain('integrations.errors.server');
  });

  it('shows and focuses the result after returning from sign-in', async () => {
    const { element } = await setup({ status: 'connected', provider: 'google' });

    const heading = element.querySelector('.result h2')!;
    expect(element.querySelector('.result')!.getAttribute('role')).toBe('status');
    expect(heading.textContent).toContain('integrations.result.connected.title');
    expect(document.activeElement).toBe(heading);
  });

  it('shows why a connection failed', async () => {
    const { element } = await setup({ status: 'error', provider: 'google', reason: 'denied' });

    expect(element.querySelector('.result')!.getAttribute('role')).toBe('alert');
    expect(element.textContent).toContain('integrations.result.error.denied');
  });
});

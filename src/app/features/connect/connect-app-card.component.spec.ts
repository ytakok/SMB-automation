import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ClipboardService } from './clipboard.service';
import { ConnectAppCardComponent, ConnectValueChange } from './connect-app-card.component';
import { ConnectApp } from './connect-apps';

const app: ConnectApp = {
  id: 'demo',
  minutes: 3,
  n8nCredential: 'Demo API',
  steps: [
    { link: 'https://example.com/start', copyRedirect: true },
    { note: true, fields: [{ key: 'token', sheetLabel: 'Token', secret: true }] },
  ],
};

async function setup(copyResult = true) {
  const copy = vi.fn().mockResolvedValue(copyResult);
  await TestBed.configureTestingModule({
    imports: [ConnectAppCardComponent],
    providers: [provideTranslateService(), { provide: ClipboardService, useValue: { copy } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(ConnectAppCardComponent);
  fixture.componentRef.setInput('app', app);
  fixture.componentRef.setInput('redirectUri', 'https://n8n.test/rest/oauth2-credential/callback');
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement, copy };
}

describe('ConnectAppCardComponent', () => {
  it('renders each step with its direct link opening in a new tab', async () => {
    const { element } = await setup();

    expect(element.querySelectorAll('li.app-step')).toHaveLength(2);
    const link = element.querySelector<HTMLAnchorElement>('a.connect-btn')!;
    expect(link.href).toBe('https://example.com/start');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(element.textContent).toContain('connect.apps.demo.steps.1.note');
  });

  it('copies the redirect address', async () => {
    const { fixture, element, copy } = await setup();

    element.querySelector<HTMLButtonElement>('.copy-row button')!.click();
    await fixture.whenStable();

    expect(copy).toHaveBeenCalledWith('https://n8n.test/rest/oauth2-credential/callback');
    expect(element.querySelector('.copy-row button')!.textContent).toContain('connect.card.copied');
  });

  it('explains what to do when copying fails', async () => {
    const { fixture, element } = await setup(false);

    element.querySelector<HTMLButtonElement>('.copy-row button')!.click();
    await fixture.whenStable();

    expect(element.textContent).toContain('connect.card.copyFailed');
  });

  it('hides secrets until asked and emits pasted values', async () => {
    const { fixture, element } = await setup();
    const changes: ConnectValueChange[] = [];
    fixture.componentInstance.valueChange.subscribe((change) => changes.push(change));

    const input = element.querySelector<HTMLInputElement>('#connect-demo-token')!;
    expect(element.querySelector('label[for="connect-demo-token"]')).toBeTruthy();
    expect(input.type).toBe('password');

    const toggle = element.querySelector<HTMLButtonElement>('.paste-row button')!;
    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    input.value = '  abc  ';
    input.dispatchEvent(new Event('input'));
    expect(changes).toEqual([{ key: 'token', value: 'abc' }]);
  });

  it('shows the ready state', async () => {
    const { fixture, element } = await setup();
    expect(element.querySelector('.app-card__status')!.textContent).toContain(
      'connect.card.waiting',
    );

    fixture.componentRef.setInput('ready', true);
    fixture.detectChanges();

    expect(element.querySelector('.app-card__status')!.textContent).toContain('connect.card.ready');
  });
});

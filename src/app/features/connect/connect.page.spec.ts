import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ClipboardService } from './clipboard.service';
import { CONNECT_APPS, DEFAULT_SELECTED_APPS } from './connect-apps';
import { ConnectPage } from './connect.page';

async function setup() {
  const copy = vi.fn().mockResolvedValue(true);
  await TestBed.configureTestingModule({
    imports: [ConnectPage],
    providers: [
      provideRouter([]),
      provideTranslateService(),
      { provide: ClipboardService, useValue: { copy } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(ConnectPage);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement, copy };
}

function type(element: HTMLElement, id: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('ConnectPage', () => {
  it('renders one heading, every app to pick, and the default apps', async () => {
    const { element } = await setup();

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelectorAll('.pick__item input[type="checkbox"]')).toHaveLength(
      CONNECT_APPS.length,
    );
    expect(element.querySelectorAll('app-connect-app-card')).toHaveLength(
      DEFAULT_SELECTED_APPS.length,
    );
    expect(element.querySelector('#connect-pick-whatsapp')).toBeTruthy();
  });

  it('shows the tenant n8n redirect address', async () => {
    const { element } = await setup();

    expect(element.querySelector('.copy-row code')!.textContent).toBe(
      'https://n8n.34-71-188-154.sslip.io/rest/oauth2-credential/callback',
    );
  });

  it('adds and removes app cards from the picker', async () => {
    const { fixture, element } = await setup();

    const hubspot = element.querySelector<HTMLInputElement>('#connect-pick-hubspot')!;
    hubspot.click();
    fixture.detectChanges();
    expect(element.querySelector('#connect-hubspot-title')).toBeTruthy();

    for (const id of [...DEFAULT_SELECTED_APPS, 'hubspot']) {
      element.querySelector<HTMLInputElement>(`#connect-pick-${id}`)!.click();
    }
    fixture.detectChanges();
    expect(element.querySelectorAll('app-connect-app-card')).toHaveLength(0);
    expect(element.textContent).toContain('connect.empty');
    expect(element.querySelector('.sheet')).toBeNull();
  });

  it('fills the connection sheet as values are pasted and copies it', async () => {
    const { fixture, element, copy } = await setup();

    type(element, 'connect-google-clientId', 'my-client.apps.googleusercontent.com');
    type(element, 'connect-google-clientSecret', 'GOCSPX-secret');
    fixture.detectChanges();

    const sheet = element.querySelector('.sheet__text')!.textContent!;
    expect(sheet).toContain('[google]\n');
    expect(sheet).toContain('Client ID: my-client.apps.googleusercontent.com');
    expect(sheet).toContain('[whatsapp] (incomplete)');

    element.querySelector<HTMLButtonElement>('.sheet__actions button')!.click();
    await fixture.whenStable();
    expect(copy).toHaveBeenCalledWith(expect.stringContaining('GOCSPX-secret'));
  });

  it('links help to the contact page and the safe sharing site', async () => {
    const { element } = await setup();

    expect(element.querySelector('.help a')!.getAttribute('href')).toBe('/en/contact');
    expect(
      element
        .querySelector<HTMLAnchorElement>('.sheet__actions a')!
        .href.startsWith('https://onetimesecret.com'),
    ).toBe(true);
  });
});

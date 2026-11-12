import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { N8N_CONFIG } from '../../core/n8n/n8n.config';
import { TenantService } from '../../core/tenant/tenant.service';
import { CHAT_CUSTOMER_KEY, isChatKey } from './chat-customer-key';
import { ChatbotWidgetComponent } from './chatbot-widget.component';

const KEY = '12a8295709455cadefc98ff0e475474422d2de265aa67324';

/** The reply arrives through a promise chain; let it finish, then render. */
async function settle(fixture: ComponentFixture<ChatbotWidgetComponent>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ChatbotWidgetComponent', () => {
  async function setup(customerKey = '') {
    await TestBed.configureTestingModule({
      imports: [ChatbotWidgetComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService(),
        {
          provide: N8N_CONFIG,
          useValue: { webhookBaseUrl: 'https://hooks.test', timeoutMs: 1000 },
        },
        { provide: CHAT_CUSTOMER_KEY, useValue: customerKey },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChatbotWidgetComponent);
    const http = TestBed.inject(HttpTestingController);
    const automation = TestBed.inject(TenantService).config().automation;
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.chat-toggle').click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#chat-message') as HTMLInputElement;
    input.value = 'Automate invoice processing';
    fixture.nativeElement
      .querySelector('.chat-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    return { fixture, http, automation };
  }

  it('sends a message to the website chatbot and renders its reply', async () => {
    const { fixture, http, automation } = await setup();

    const request = http.expectOne(`https://hooks.test/webhook/${automation?.chatWebhookPath}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      action: 'sendMessage',
      chatInput: 'Automate invoice processing',
    });
    expect(request.request.body.sessionId).toEqual(expect.any(String));
    expect(request.request.body.metadata).toBeUndefined();
    request.flush([{ output: 'We can help automate that workflow.' }]);
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('We can help automate that workflow.');
    http.verify();
  });

  it('sends the customer key to the multi-customer assistant when one is set', async () => {
    const { fixture, http, automation } = await setup(KEY);

    const request = http.expectOne(
      `https://hooks.test/webhook/${automation?.customerChatWebhookPath}`,
    );
    expect(request.request.body).toMatchObject({
      chatInput: 'Automate invoice processing',
      metadata: { customerKey: KEY },
    });
    request.flush({ output: 'Booked.' });
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('Booked.');
    http.verify();
  });

  it('shows the error message when n8n fails', async () => {
    const { fixture, http, automation } = await setup();

    http
      .expectOne(`https://hooks.test/webhook/${automation?.chatWebhookPath}`)
      .flush(null, { status: 500, statusText: 'Error' });
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'home.chatbot.error',
    );
  });
});

describe('isChatKey', () => {
  it('accepts hex chat keys and rejects anything else', () => {
    expect(isChatKey(KEY)).toBe(true);
    expect(isChatKey('not-a-key')).toBe(false);
    expect(isChatKey('abc')).toBe(false);
    expect(isChatKey(null)).toBe(false);
  });
});

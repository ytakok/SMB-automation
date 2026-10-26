import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ChatbotWidgetComponent } from './chatbot-widget.component';

describe('ChatbotWidgetComponent', () => {
  it('sends a message to the webhook and renders its reply', async () => {
    await TestBed.configureTestingModule({
      imports: [ChatbotWidgetComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChatbotWidgetComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.chat-toggle').click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#chat-message') as HTMLInputElement;
    input.value = 'Automate invoice processing';
    fixture.nativeElement.querySelector('.chat-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    const request = http.expectOne(
      'https://n8n.34-71-188-154.sslip.io/webhook/446e48f9-570a-416a-be34-394c3c540779/chat',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      action: 'sendMessage',
      chatInput: 'Automate invoice processing',
    });
    expect(request.request.body.sessionId).toEqual(expect.any(String));
    request.flush([{ output: 'We can help automate that workflow.' }]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('We can help automate that workflow.');
    http.verify();
  });
});

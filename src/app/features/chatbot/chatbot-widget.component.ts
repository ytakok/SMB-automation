import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const CHAT_ENDPOINT =
  'https://smb.34-71-188-154.sslip.io/webhook/446e48f9-570a-416a-be34-394c3c540779/chat';

function replyText(response: unknown): string {
  if (typeof response === 'string' && response.trim()) {
    return response.trim();
  }
  if (Array.isArray(response)) {
    for (const item of response) {
      const reply = replyText(item);
      if (reply) {
        return reply;
      }
    }
  } else if (typeof response === 'object' && response !== null) {
    for (const key of ['output', 'response', 'text', 'answer', 'message']) {
      const reply = replyText((response as Record<string, unknown>)[key]);
      if (reply) {
        return reply;
      }
    }
  }
  throw new Error('The chat service returned no reply.');
}

@Component({
  selector: 'app-chatbot-widget',
  imports: [TranslatePipe],
  template: `
    <div class="chat-widget" [class.is-open]="isOpen()">
      @if (isOpen()) {
        <section
          class="chat-panel"
          role="dialog"
          [attr.aria-label]="'home.chatbot.title' | translate"
          aria-modal="false"
        >
          <header class="chat-header">
            <h2>{{ 'home.chatbot.title' | translate }}</h2>
            <button
              class="chat-close"
              type="button"
              [attr.aria-label]="'home.chatbot.close' | translate"
              (click)="isOpen.set(false)"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div class="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
            <p class="chat-message chat-message--assistant">{{ 'home.chatbot.greeting' | translate }}</p>
            @for (message of messages(); track $index) {
              <p
                class="chat-message"
                [class.chat-message--user]="message.role === 'user'"
                [class.chat-message--assistant]="message.role === 'assistant'"
                dir="auto"
              >{{ message.text }}</p>
            }
            @if (sending()) {
              <p class="chat-message chat-message--assistant">{{ 'home.chatbot.sending' | translate }}</p>
            }
          </div>
          @if (hasError()) {
            <p class="chat-error" role="alert">{{ 'home.chatbot.error' | translate }}</p>
          }
          <form class="chat-form" (submit)="sendMessage($event, messageInput)">
            <label class="visually-hidden" for="chat-message">
              {{ 'home.chatbot.inputLabel' | translate }}
            </label>
            <input
              #messageInput
              id="chat-message"
              name="message"
              type="text"
              autocomplete="off"
              dir="auto"
              maxlength="2000"
              [placeholder]="'home.chatbot.placeholder' | translate"
              [disabled]="sending()"
            />
            <button class="chat-send" type="submit" [disabled]="sending()">
              {{ 'home.chatbot.send' | translate }}
            </button>
          </form>
        </section>
      }
      <button
        class="chat-toggle"
        type="button"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="
          (isOpen() ? 'home.chatbot.close' : 'home.chatbot.open') | translate
        "
        (click)="isOpen.update((open) => !open)"
      >
        <span aria-hidden="true">{{ isOpen() ? '×' : '✦' }}</span>
        <span>{{ (isOpen() ? 'home.chatbot.close' : 'home.chatbot.open') | translate }}</span>
      </button>
    </div>
  `,
  styleUrl: './chatbot-widget.component.less',
})
export class ChatbotWidgetComponent {
  private readonly http = inject(HttpClient);

  protected readonly isOpen = signal(false);
  protected readonly sending = signal(false);
  protected readonly hasError = signal(false);
  protected readonly messages = signal<ChatMessage[]>([]);

  private sessionId = '';

  protected async sendMessage(event: SubmitEvent, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    const chatInput = input.value.trim();
    if (!chatInput || this.sending()) {
      return;
    }

    input.value = '';
    this.hasError.set(false);
    this.messages.update((messages) => [...messages, { role: 'user', text: chatInput }]);
    this.sending.set(true);

    try {
      this.sessionId ||= globalThis.crypto.randomUUID();
      const response = await firstValueFrom(
        this.http.post<unknown>(CHAT_ENDPOINT, {
          action: 'sendMessage',
          sessionId: this.sessionId,
          chatInput,
        }),
      );
      this.messages.update((messages) => [
        ...messages,
        { role: 'assistant', text: replyText(response) },
      ]);
    } catch (error) {
      console.error('Chat request failed.', error);
      this.hasError.set(true);
    } finally {
      this.sending.set(false);
    }
  }
}

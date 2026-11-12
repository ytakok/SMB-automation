import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';

const STORAGE_KEY = 'smb.chatKey';
/** Chat keys are random hex strings made by the n8n "onboard customer" workflow. */
const CHAT_KEY_PATTERN = /^[a-f0-9]{16,128}$/i;

export function isChatKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && CHAT_KEY_PATTERN.test(value);
}

/**
 * The customer chat key from `?chatKey=` in the page URL, kept for this browser tab so it survives
 * in-app navigation. Empty when there is none (the widget then uses the public website chatbot).
 * The key only picks which business the n8n assistant serves; n8n checks it on every message.
 */
export const CHAT_CUSTOMER_KEY = new InjectionToken<string>('CHAT_CUSTOMER_KEY', {
  providedIn: 'root',
  factory: () => {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return '';
    }
    const fromUrl = new URLSearchParams(inject(DOCUMENT).location.search).get('chatKey');
    try {
      if (isChatKey(fromUrl)) {
        sessionStorage.setItem(STORAGE_KEY, fromUrl);
        return fromUrl;
      }
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return isChatKey(saved) ? saved : '';
    } catch {
      return isChatKey(fromUrl) ? fromUrl : '';
    }
  },
});

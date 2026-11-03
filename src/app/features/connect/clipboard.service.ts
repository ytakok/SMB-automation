import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

/** Copies text to the clipboard. Resolves false when copying is not possible. */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  async copy(text: string): Promise<boolean> {
    if (!this.isBrowser || !navigator.clipboard?.writeText) {
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}

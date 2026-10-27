import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { FirestoreGateway } from '../firebase/firestore-gateway';
import { I18nService } from '../i18n/i18n.service';
import { TenantService } from '../tenant/tenant.service';

export const CONTACTS_COLLECTION = 'contacts';

/** Limits shared by the form validators and firestore.rules. */
export const CONTACT_LIMITS = {
  fullNameMin: 2,
  fullNameMax: 100,
  emailMax: 254,
  phoneMax: 25,
  phoneDigitsMin: 7,
  phoneDigitsMax: 15,
  messageMax: 2000,
} as const;

export interface ContactRequest {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly firestore = inject(FirestoreGateway);
  private readonly tenant = inject(TenantService);
  private readonly i18n = inject(I18nService);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Saves the request to the Firestore `contacts` collection and returns the new document id. */
  submit(request: ContactRequest): Promise<string> {
    if (!this.browser) {
      return Promise.reject(new Error('Contact requests can only be sent from the browser.'));
    }

    return this.firestore.add(CONTACTS_COLLECTION, {
      tenantId: this.tenant.id(),
      fullName: request.fullName.trim(),
      email: request.email.trim().toLowerCase(),
      phone: request.phone.trim(),
      message: request.message.trim(),
      lang: this.i18n.lang(),
      pageUrl: this.document.location.pathname,
      status: 'new',
    });
  }
}

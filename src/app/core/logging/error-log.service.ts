import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';
import { FIREBASE_CONFIG } from '../firebase/firestore-gateway';
import { TenantService } from '../tenant/tenant.service';

export type ErrorSource = 'global' | 'http' | 'manual';

@Injectable({ providedIn: 'root' })
export class ErrorLogService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly tenant = inject(TenantService);
  private readonly firebaseConfig = inject(FIREBASE_CONFIG);
  private readonly recent = new Map<string, number>();
  private database?: Promise<import('firebase/firestore/lite').Firestore>;

  async log(
    error: unknown,
    context: { source: ErrorSource; extra?: Record<string, unknown> },
  ): Promise<void> {
    const normalized = error instanceof Error ? error : new Error(String(error));
    const now = Date.now();
    const key = `${normalized.name}:${normalized.message}`;
    if ((this.recent.get(key) ?? 0) > now - 60_000) {
      return;
    }
    if (this.recent.size >= 50) {
      console.error('Runtime error logging limit reached for this session.', normalized);
      return;
    }
    this.recent.set(key, now);

    if (!this.browser) {
      console.error(normalized);
      return;
    }

    if (!this.firebaseConfig.apiKey || !this.firebaseConfig.projectId) {
      console.error(
        'Firebase error logging is not configured. Set the Firebase fields in src/environments/environment.ts.',
        normalized,
      );
      return;
    }

    try {
      const [{ initializeApp, getApps }, { addDoc, collection, getFirestore, serverTimestamp }] =
        await Promise.all([import('firebase/app'), import('firebase/firestore/lite')]);
      const app = getApps()[0] ?? initializeApp(this.firebaseConfig);
      this.database ??= Promise.resolve(getFirestore(app));
      const url = this.browser ? window.location.pathname : '';
      await addDoc(collection(await this.database, 'errorLogs'), {
        tenantId: this.tenant.id(),
        message: normalized.message.slice(0, 1000),
        name: normalized.name.slice(0, 200),
        stack: (normalized.stack ?? '').slice(0, 4000),
        source: context.source,
        url,
        lang: document.documentElement.lang.slice(0, 20),
        userAgent: navigator.userAgent.slice(0, 300),
        appVersion: environment.version,
        extra: context.extra ?? null,
        createdAt: serverTimestamp(),
      });
    } catch (loggingError) {
      console.error('Failed to write the runtime error to Firestore.', loggingError, normalized);
    }
  }
}

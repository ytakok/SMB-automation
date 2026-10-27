import { inject, Injectable, InjectionToken } from '@angular/core';
import type { FirebaseOptions } from 'firebase/app';
import { environment } from '../../../environments/environment';

/** Public Firebase web-app config. Override in tests or per tenant if needed. */
export const FIREBASE_CONFIG = new InjectionToken<FirebaseOptions>('FIREBASE_CONFIG', {
  providedIn: 'root',
  factory: () => environment.firebase,
});

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Firebase is not configured. Set the Firebase fields in src/environments/environment.ts.',
    );
    this.name = 'FirebaseNotConfiguredError';
  }
}

/**
 * Thin wrapper around Firestore Lite so feature services stay easy to test.
 * Firebase is imported lazily, so it never enters the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class FirestoreGateway {
  private readonly config = inject(FIREBASE_CONFIG);

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.projectId);
  }

  /** Adds a document with a server-side `createdAt` timestamp and returns its id. */
  async add(collectionName: string, data: Record<string, unknown>): Promise<string> {
    if (!this.isConfigured()) {
      throw new FirebaseNotConfiguredError();
    }

    const [{ initializeApp, getApps }, { addDoc, collection, getFirestore, serverTimestamp }] =
      await Promise.all([import('firebase/app'), import('firebase/firestore/lite')]);
    const app = getApps()[0] ?? initializeApp(this.config);
    const reference = await addDoc(collection(getFirestore(app), collectionName), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return reference.id;
  }
}

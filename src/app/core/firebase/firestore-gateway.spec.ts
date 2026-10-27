import { TestBed } from '@angular/core/testing';
import { FIREBASE_CONFIG, FirebaseNotConfiguredError, FirestoreGateway } from './firestore-gateway';

describe('FirestoreGateway', () => {
  it('rejects writes when the Firebase project is not configured', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_CONFIG, useValue: { apiKey: '', projectId: '' } }],
    });
    const gateway = TestBed.inject(FirestoreGateway);

    expect(gateway.isConfigured()).toBe(false);
    await expect(gateway.add('contacts', {})).rejects.toBeInstanceOf(FirebaseNotConfiguredError);
  });

  it('reports a configured project', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_CONFIG, useValue: { apiKey: 'key', projectId: 'demo' } }],
    });

    expect(TestBed.inject(FirestoreGateway).isConfigured()).toBe(true);
  });
});

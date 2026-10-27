import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FirestoreGateway } from '../firebase/firestore-gateway';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  function setup(platform: 'browser' | 'server' = 'browser') {
    const add = vi.fn().mockResolvedValue('doc-123');
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: FirestoreGateway, useValue: { add } },
      ],
    });
    return { service: TestBed.inject(ContactService), add };
  }

  it('writes a trimmed request with tenant and language to the contacts collection', async () => {
    const { service, add } = setup();

    const id = await service.submit({
      fullName: '  Dana Levi ',
      email: ' Dana@Example.COM ',
      phone: ' 050-123-4567 ',
      message: '  Automate invoices  ',
    });

    expect(id).toBe('doc-123');
    expect(add).toHaveBeenCalledWith('contacts', {
      tenantId: 'default',
      fullName: 'Dana Levi',
      email: 'dana@example.com',
      phone: '050-123-4567',
      message: 'Automate invoices',
      lang: 'en',
      pageUrl: expect.any(String),
      status: 'new',
    });
  });

  it('propagates Firestore failures to the caller', async () => {
    const { service, add } = setup();
    add.mockRejectedValueOnce(new Error('offline'));

    await expect(
      service.submit({ fullName: 'Dana', email: 'd@e.co', phone: '0501234567', message: '' }),
    ).rejects.toThrow('offline');
  });

  it('never writes during server rendering', async () => {
    const { service, add } = setup('server');

    await expect(
      service.submit({ fullName: 'Dana', email: 'd@e.co', phone: '0501234567', message: '' }),
    ).rejects.toThrow('only be sent from the browser');
    expect(add).not.toHaveBeenCalled();
  });
});

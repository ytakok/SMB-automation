import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TenantService } from '../tenant/tenant.service';
import { N8N_CONFIG } from './n8n.config';

describe('N8N_CONFIG', () => {
  function resolve(hostname: string, origin: string, platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TenantService,
          useValue: {
            config: () => ({
              automation: {
                n8nBaseUrl: 'https://n8n.example',
                webhookBaseUrl: 'https://hooks.example',
              },
            }),
          },
        },
        { provide: DOCUMENT, useValue: { location: { hostname, origin } } },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(N8N_CONFIG);
  }

  it('uses the dev-server origin for localhost webhook proxying', () => {
    expect(resolve('localhost', 'http://localhost:4200').webhookBaseUrl).toBe(
      'http://localhost:4200',
    );
  });

  it('keeps the tenant webhook URL for non-local hosts', () => {
    expect(resolve('smb-automation.example', 'https://smb-automation.example').webhookBaseUrl).toBe(
      'https://hooks.example',
    );
  });

  it('keeps the tenant webhook URL during server rendering', () => {
    expect(resolve('localhost', 'http://localhost:4200', 'server').webhookBaseUrl).toBe(
      'https://hooks.example',
    );
  });
});

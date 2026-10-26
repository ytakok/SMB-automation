import { TestBed } from '@angular/core/testing';
import { TenantService } from './tenant.service';
import { ACTIVE_TENANT } from './active-tenant';

describe('TenantService', () => {
  it('exposes the build-time tenant and resolves tenant assets', () => {
    const tenant = TestBed.inject(TenantService);

    expect(tenant.id()).toBe(ACTIVE_TENANT.id);
    expect(tenant.language(ACTIVE_TENANT.defaultLang)).toBeDefined();
    expect(tenant.asset('logo.svg')).toBe(`/tenants/${ACTIVE_TENANT.id}/logo.svg`);
  });
});

import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { TenantService } from '../tenant/tenant.service';

export const langGuard: CanMatchFn = (_route, segments) =>
  inject(TenantService)
    .languages()
    .some((language) => language.code === segments[0]?.path);

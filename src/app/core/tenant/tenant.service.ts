import { computed, Injectable, signal } from '@angular/core';
import { ACTIVE_TENANT } from './active-tenant';
import { TenantConfig } from './tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly tenant = signal<TenantConfig>(ACTIVE_TENANT);

  readonly config = this.tenant.asReadonly();
  readonly id = computed(() => this.tenant().id);
  readonly languages = computed(() => this.tenant().languages);

  language(code: string) {
    return this.tenant().languages.find((language) => language.code === code);
  }

  asset(path: string): string {
    return `/tenants/${this.id()}/${path.replace(/^\/+/, '')}`;
  }
}

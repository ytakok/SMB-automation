import config from '@public/tenants/default/tenant.json';
import { parseTenantConfig } from '../../app/core/tenant/tenant.model';

export const ACTIVE_TENANT = parseTenantConfig(config);

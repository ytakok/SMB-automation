import config from '@public/tenants/default/tenant.json';
import { parseTenantConfig } from './tenant.model';

export const ACTIVE_TENANT = parseTenantConfig(config);

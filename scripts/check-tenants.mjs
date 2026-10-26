import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const tenantsRoot = resolve('public/tenants');
const tenantIds = readdirSync(tenantsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const domains = readJson('public/tenants/tenants.json');
const angular = readJson('angular.json');
const project = angular.projects['SMB-automation'];

for (const tenantId of tenantIds) {
  const tenantPath = `public/tenants/${tenantId}`;
  const tenant = readJson(`${tenantPath}/tenant.json`);
  if (tenant.id !== tenantId) {
    throw new Error(`${tenantPath}/tenant.json id must equal its directory name.`);
  }
  if (!tenant.languages.some(({ code }) => code === tenant.defaultLang)) {
    throw new Error(`${tenantId} has an unsupported default language.`);
  }
  for (const language of tenant.languages) {
    const expectedDir = ['ar', 'fa', 'he', 'ur'].includes(language.code) ? 'rtl' : 'ltr';
    if (language.dir !== expectedDir) {
      throw new Error(`${tenantId}/${language.code} must use ${expectedDir} direction.`);
    }
  }
  for (const requiredFile of [
    `${tenantPath}/tenant.json`,
    `${tenantPath}/logo.svg`,
    `${tenantPath}/favicon.svg`,
    `${tenantPath}/llms.txt`,
    `src/tenants/${tenantId}/theme.less`,
    `src/tenants/${tenantId}/active-tenant.ts`,
  ]) {
    if (!existsSync(resolve(requiredFile))) {
      throw new Error(`Missing tenant file: ${requiredFile}`);
    }
  }
  if (!tenant.logo.src.startsWith(`/tenants/${tenantId}/`)) {
    throw new Error(`${tenantId} logo must point to its own tenant asset directory.`);
  }
  if (!Object.values(domains).includes(tenantId)) {
    throw new Error(`${tenantId} is not mapped by public/tenants/tenants.json.`);
  }
  if (!project.architect.build.configurations[tenantId]) {
    throw new Error(`${tenantId} has no Angular build configuration.`);
  }
  if (!project.architect.serve.configurations[tenantId]) {
    throw new Error(`${tenantId} has no Angular serve configuration.`);
  }
  const productionHost = readFileSync(resolve('deploy/Caddyfile'), 'utf8');
  const siteHost = tenant.siteUrl.replace(/^https?:\/\//, '');
  if (!productionHost.includes(siteHost)) {
    throw new Error(`${tenantId} siteUrl is missing from deploy/Caddyfile.`);
  }
  for (const [domain, mappedTenant] of Object.entries(domains)) {
    if (mappedTenant === tenantId && !productionHost.includes(`${domain} {`)) {
      throw new Error(`${tenantId} domain ${domain} is missing from deploy/Caddyfile.`);
    }
  }
}

for (const [domain, tenantId] of Object.entries(domains)) {
  if (!tenantIds.includes(tenantId)) {
    throw new Error(`${domain} references unknown tenant ${tenantId}.`);
  }
}

console.log(`Checked configuration for ${tenantIds.length} tenant(s).`);

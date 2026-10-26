import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readJson = (path) => JSON.parse(readFileSync(resolve(path), 'utf8'));

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return flattenValue(item, path);
  });
}

function flattenValue(value, path) {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => flattenValue(entry, `${path}.${index}`));
  }
  if (value && typeof value === 'object') {
    return flatten(value, path);
  }
  if (typeof value === 'string' && !value.trim()) {
    throw new Error(`Translation value is empty: ${path}`);
  }
  return [path];
}

const tenantsDir = resolve('public/tenants');
const tenantIds = readdirSync(tenantsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const requiredRouteKeys = [
  'home.seo.title',
  'home.seo.description',
  'about.seo.title',
  'about.seo.description',
  'services.seo.title',
  'services.seo.description',
  'contact.seo.title',
  'contact.seo.description',
  'notFound.seo.title',
  'notFound.seo.description',
];

for (const tenantId of tenantIds) {
  const tenant = readJson(`public/tenants/${tenantId}/tenant.json`);
  const languageFiles = readdirSync(resolve(`public/tenants/${tenantId}/i18n`)).filter((name) =>
    name.endsWith('.json'),
  );
  const defaultFile = `${tenant.defaultLang}.json`;
  if (!languageFiles.includes(defaultFile)) {
    throw new Error(`${tenantId} is missing its default translation file ${defaultFile}`);
  }

  const translations = readJson(`public/tenants/${tenantId}/i18n/${defaultFile}`);
  const defaultKeys = flatten(translations).sort();
  const defaultKeySet = new Set(defaultKeys);
  for (const filename of languageFiles) {
    const keys = flatten(readJson(`public/tenants/${tenantId}/i18n/${filename}`)).sort();
    if (JSON.stringify(keys) !== JSON.stringify(defaultKeys)) {
      throw new Error(`${tenantId}/${filename} has keys that differ from ${defaultFile}`);
    }
  }
  for (const key of requiredRouteKeys) {
    if (!defaultKeySet.has(key)) {
      throw new Error(`${tenantId} is missing route SEO translation: ${key}`);
    }
  }
  for (const navItem of tenant.nav) {
    const translation = navItem.labelKey
      .split('.')
      .reduce((value, key) => value?.[key], translations);
    if (typeof translation !== 'string' || !translation.trim()) {
      throw new Error(`${tenantId} has an unresolved navigation key: ${navItem.labelKey}`);
    }
  }
}

console.log(`Checked translations for ${tenantIds.length} tenant(s).`);

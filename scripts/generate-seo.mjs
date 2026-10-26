import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tenantId = process.argv[2];
if (!tenantId || !/^[a-z0-9-]+$/.test(tenantId)) {
  throw new Error('Usage: node scripts/generate-seo.mjs <tenant-id>');
}

const tenant = JSON.parse(readFileSync(resolve(`public/tenants/${tenantId}/tenant.json`), 'utf8'));
const paths = JSON.parse(readFileSync(resolve('src/app/routes.manifest.json'), 'utf8')).filter(
  (path) => path !== 'not-found',
);
const output = resolve(`dist/${tenantId}/browser`);
const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (character) => {
    const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
    return entities[character];
  });
const pageUrl = (language, path) =>
  new URL(`/${language}${path ? `/${path}` : ''}`, tenant.siteUrl).toString();
const alternateLinks = (path) => [
  ...tenant.languages.map(
    ({ code }) =>
      `<xhtml:link rel="alternate" hreflang="${escapeXml(code)}" href="${escapeXml(pageUrl(code, path))}"/>`,
  ),
  `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(pageUrl(tenant.defaultLang, path))}"/>`,
];
const today = new Date().toISOString().slice(0, 10);
const entries = paths.flatMap((path) =>
  tenant.languages.map(
    ({ code }) =>
      `<url><loc>${escapeXml(pageUrl(code, path))}</loc><lastmod>${today}</lastmod>${alternateLinks(path).join('')}</url>`,
  ),
);

writeFileSync(
  resolve(output, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>\n`,
);
writeFileSync(
  resolve(output, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${tenant.siteUrl}/sitemap.xml\n`,
);
copyFileSync(resolve(`public/tenants/${tenantId}/llms.txt`), resolve(output, 'llms.txt'));

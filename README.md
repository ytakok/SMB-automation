# SMB Automation

An Angular 21 standalone, mobile-first site for SMB Automation. The app is configured for one tenant per build and static prerendering; production does not run an Angular/Node server.

## Development

```bash
npm start
```

The development server opens at `http://localhost:4200/en`. The root path redirects to the tenant's default language.

## Production build

```bash
npm run build
```

This runs a static/prerendered Angular build for tenant `default`, then generates `sitemap.xml`, `robots.txt`, and `llms.txt` in `dist/default/browser/`. The output is static and can be served by Caddy, Nginx, Firebase Hosting, or another static host.

Use `npm run build:angular` to run only the Angular build. Tenant configuration lives in `public/tenants/default/tenant.json`; the build-time binding and theme are in `src/tenants/default/`.

## Configuration before deployment

The `.example` site URL and email are intentional placeholders. Replace them in the tenant JSON, `public/tenants/default/llms.txt`, `public/tenants/tenants.json`, and `deploy/Caddyfile` before publishing.

Firebase error logging is opt-in until a Firebase project is configured. Set the public Firebase web-app values in `src/environments/environment.ts`, deploy `firestore.rules`, and enable Firebase App Check. Do not put server credentials in the frontend.

## Checks and tests

```bash
npm run check
npm test -- --watch=false
```

The checks validate translation keys, tenant assets/configuration, and WCAG contrast for the tenant palette. Unit tests use Angular's Vitest runner.

## Static hosting

`deploy/Caddyfile` is the production host example. `deploy/Caddyfile.test` serves the local static build on port 8080. Both redirect `/` to `/en`, serve clean prerendered paths, and return the prerendered not-found page for missing paths.

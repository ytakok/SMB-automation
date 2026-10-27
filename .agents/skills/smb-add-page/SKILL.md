---
name: smb-add-page
description: Add, rename or change a page/route in the SMB Automation Angular site (lazy route, prerender manifest, en+he translations, SEO keys, nav item, spec).
---

# Add or change a page in SMB Automation

Read `AGENTS.md` first. Use the `about` page as the template for structure and style.

## Steps (new page `<slug>`, class `<Name>Page`)

1. **Files** in `src/app/features/<slug>/`:
   - `<slug>.page.ts`: standalone component, `imports: [TranslatePipe, RouterLink?]`,
     `templateUrl`, `styleUrl`; inject `TenantService` / `I18nService` only if needed.
   - `<slug>.page.html`: wrap in `<article>`; exactly one `<h1>`; sections with headings;
     answer-first intro paragraph (AEO); links as `[routerLink]="['/', i18n.lang(), 'contact']"`.
   - `<slug>.page.less`: tokens only, mobile-first with `@import '_breakpoints';` and `.from-md(...)`,
     logical properties; stay under the 4 kB component budget (move reusable parts to `src/styles/`).
   - `<slug>.page.spec.ts`: `TestBed` + `provideTranslateService()` + `provideRouter([])`;
     assert one `<h1>`, key content (translation keys), link targets.
2. **Route** in `src/app/app.routes.ts` inside the `:lang` children, before the `**` route:
   ```ts
   {
     path: '<slug>',
     loadComponent: () => import('./features/<slug>/<slug>.page').then((m) => m.<Name>Page),
     data: { seo: { titleKey: '<slug>.seo.title', descriptionKey: '<slug>.seo.description' } },
   },
   ```
3. **Prerender + sitemap**: add `"<slug>"` to `src/app/routes.manifest.json`.
4. **Translations** in `public/tenants/default/i18n/en.json` and `he.json`: a `<slug>` object with
   all page strings plus `seo.title` (≤ 60 chars) and `seo.description` (≤ 160 chars).
   Add both SEO keys to `requiredRouteKeys` in `scripts/check-i18n.mjs`.
5. **Navigation** (optional): add `{ "path": "<slug>", "labelKey": "nav.<slug>" }` to
   `public/tenants/default/tenant.json` `nav` and `nav.<slug>` to both translation files.
6. **llms.txt**: add a line describing the page if it carries key business facts.

## Renaming a slug

Change the route path, `routes.manifest.json`, `tenant.json` nav, any `routerLink`s
(search the repo for the old slug), and keep the old URL working if it was public (add a redirect route).

## Verify

`npm test -- --watch=false` · `npm run check:i18n` · `npm run build` (no budget warning) ·
open `/en/<slug>` and `/he/<slug>` at 390px and 1366px: RTL mirrored, one h1, title + description set.

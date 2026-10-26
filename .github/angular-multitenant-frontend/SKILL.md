---
name: angular-multitenant-frontend
description: Expert guidelines for building modern Angular applications using Strongly Typed Forms, Async Validation, Signal-based State, Testing, and Resolvers. Build or extend a multi-tenant, white-label Angular 21+ website: standalone, lazy-loaded, mobile-first, RTL/LTR i18n with ngx-translate, Less + CSS variables, static prerendering (SSG, no runtime server), SEO/AEO, WCAG 2.2, Firebase error logs.
---

# Angular 21+ Multi-Tenant White-Label Frontend (Static / SSG)

Use this skill whenever creating, scaffolding, or extending an Angular (v21 or newer) website that serves several companies (tenants) from one codebase, where each tenant has its own logo, colors, images, languages and content.

Rendering model: **no runtime SSR server**. Each tenant is built separately, every route × language is **prerendered to static HTML at build time** (SSG), and the result is served by a plain static host (Caddy, Nginx, Firebase Hosting, Cloudflare Pages, S3 + CloudFront...). The browser hydrates the static HTML and continues as a normal SPA.

Non-negotiables (every task must respect all of these):
1. Standalone components only (no NgModules). In v21+ components are standalone by default, so do not write `standalone: true`.
2. Every feature route is lazy loaded (`loadComponent` / `loadChildren`).
3. Styles are written in **Less**; all themable values are **CSS custom properties**. Each tenant overrides them in its own folder.
4. **Mobile-first**: base styles target the smallest screen; larger layouts are added with `min-width` media queries only.
5. Multi-language with **ngx-translate**, full **RTL and LTR** support using CSS logical properties.
6. **SEO + AEO** without a server: build-time prerendering of every route × language, per-page meta, canonical, hreflang, JSON-LD, and build-generated `sitemap.xml`, `robots.txt`, `llms.txt`.
7. **One build per tenant**: the tenant is fixed at build time (configuration + `fileReplacements`), never resolved from the hostname at runtime.
8. **WCAG 2.2 AA** (https://www.w3.org/TR/WCAG22/).
9. Runtime errors are logged to a **Firebase Firestore** collection.
10. Page background is **white** (`#ffffff`); tenants change accents, not the base background.
11. Modern, professional look: generous whitespace, fluid type, clear hierarchy, subtle motion that respects `prefers-reduced-motion`.
12. **Tested**: every component, service, guard, resolver, interceptor and pipe ships with a spec in the same change (section 13).

Before writing code, check the installed versions (`ng version`, `npm ls @ngx-translate/core firebase @angular/ssr`) and adapt APIs if they differ from the snippets below.

> `@angular/ssr` is installed only as the **build-time prerender engine** (`outputMode: "static"`). There is no `server.ts`, no Node process in production, and nothing renders per request. If you cannot use prerendering at all, see section 14.4 (CSR-only) and its SEO trade-offs.

---

## 1. Workflow

1. Confirm inputs (ask only what is missing): tenant ids + domains, languages per tenant (and which are RTL: `he`, `ar`, `fa`, `ur`), default language, pages needed, Firebase project, static host.
2. Scaffold (new project only):
   ```bash
   ng new <app> --style=less --no-ssr --routing
   ng add @angular/ssr          # prerender engine only; then delete src/server.ts (section 5.3)
   npm i @ngx-translate/core @ngx-translate/http-loader firebase
   npm i -D @axe-core/playwright @playwright/test @testing-library/angular @testing-library/user-event stylelint stylelint-use-logical
   ```
3. Create the folder structure (section 2), shared test helpers (section 13.2) and core services (sections 3-9) with their specs.
4. Add one tenant end-to-end (`default`), then a second one to prove white-labeling works (each with its own build configuration, section 4.3).
5. Build features as lazy routes using the shared layout; add every new path to `routes.manifest.json`; write each spec alongside its code.
6. Verify (sections 11 and 13.9): unit tests, per-tenant static build, LTR and RTL in mobile/tablet/desktop, axe scan, Lighthouse, contrast of every tenant palette on white.

---

## 2. Folder structure

```
src/
  app/
    core/
      tenant/        tenant.service.ts, tenant.model.ts, active-tenant.ts (default; replaced per build)
      i18n/          i18n.service.ts, tenant-translate.loader.ts, fs-translate.loader.ts, lang.resolver.ts, lang.guard.ts
      seo/           seo.service.ts, json-ld.ts
      logging/       error-log.service.ts, global-error-handler.ts, http-error.interceptor.ts
      a11y/          live-announcer usage, focus helpers
    layout/
      shell/         shell.component.ts (header + <main> + footer)
      header/        header.component.ts
      navbar/        navbar.component.ts
      footer/        footer.component.ts
      skip-link/     skip-link.component.ts
      lang-switcher/ lang-switcher.component.ts
    features/
      home/          home.page.ts, home.page.html, home.page.less
      about/
      services/      services.routes.ts + pages
      contact/
      not-found/
    shared/ui/       button, card, section, faq (presentational, OnPush-friendly signal inputs)
    routes.manifest.json   every prerendered path (without the :lang prefix)
    app.ts
    app.config.ts
    app.config.server.ts   build-time prerender config only
    app.routes.ts
    app.routes.server.ts
  main.ts
  main.server.ts           prerender entry (no server.ts)
  styles/
    _tokens.less       default CSS variables (:root)
    _breakpoints.less  mobile-first mixins
    _reset.less
    _base.less         white background, typography, focus styles
    _a11y.less         .visually-hidden, skip-link, reduced motion
    _utilities.less
    styles.less        imports all of the above
  tenants/
    default/theme.less, active-tenant.ts
    acme/theme.less, active-tenant.ts
public/
  i18n/                shared strings: en.json, he.json, ar.json ...
  tenants/
    tenants.json         { "acme.com": "acme", "www.acme.com": "acme" } — used to generate hosting config
    default/
      tenant.json
      logo.svg, logo-inverse.svg, favicon.ico, og-image.jpg
      images/
      i18n/              tenant overrides: en.json, he.json ...
      llms.txt
    acme/ ... same shape
scripts/
  generate-seo.mjs       sitemap.xml, robots.txt, llms.txt per tenant build
  check-*.mjs            static checks (section 13.6)
deploy/
  Caddyfile              production static hosting (one site block per tenant)
  Caddyfile.test         e2e hosting with *.test hosts
```

Rule: anything a tenant can change lives in `src/tenants/<id>/` (styles + build-time tenant binding) or `public/tenants/<id>/` (assets, config, translations). Components never hard-code a logo path, color, brand name or language list.

---

## 3. Tenant model and build-time selection

`public/tenants/<id>/tenant.json`:
```json
{
  "id": "acme",
  "name": "Acme Ltd",
  "defaultLang": "he",
  "languages": [
    { "code": "he", "dir": "rtl", "label": "עברית" },
    { "code": "en", "dir": "ltr", "label": "English" }
  ],
  "logo": { "src": "/tenants/acme/logo.svg", "width": 140, "height": 40 },
  "siteUrl": "https://acme.com",
  "seo": { "ogImage": "/tenants/acme/og-image.jpg", "twitter": "@acme" },
  "contact": { "email": "info@acme.com", "phone": "+972-3-0000000" },
  "social": ["https://www.linkedin.com/company/acme"],
  "nav": [
    { "path": "", "labelKey": "nav.home" },
    { "path": "about", "labelKey": "nav.about" },
    { "path": "services", "labelKey": "nav.services" },
    { "path": "contact", "labelKey": "nav.contact" }
  ]
}
```

The tenant is chosen when building (`ng build -c production,acme`), not at runtime. The config is **imported as JSON**, so it is available synchronously in the browser and during prerendering, with no HTTP request and no app initializer.

`tsconfig.json` (compilerOptions):
```json
"resolveJsonModule": true,
"esModuleInterop": true,
"paths": { "@public/*": ["public/*"], "@core/*": ["src/app/core/*"] }
```

```ts
// src/app/core/tenant/active-tenant.ts — default tenant; each build replaces this file
import config from '@public/tenants/default/tenant.json';
import type { TenantConfig } from './tenant.model';
export const ACTIVE_TENANT = config as TenantConfig;
```
```ts
// src/tenants/acme/active-tenant.ts — same shape, different JSON
import config from '@public/tenants/acme/tenant.json';
import type { TenantConfig } from '@core/tenant/tenant.model';
export const ACTIVE_TENANT = config as TenantConfig;
```

```ts
// core/tenant/tenant.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { TenantConfig } from './tenant.model';
import { ACTIVE_TENANT } from './active-tenant';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly _config = signal<TenantConfig>(ACTIVE_TENANT);
  readonly config = this._config.asReadonly();
  readonly id = computed(() => this._config().id);
  readonly languages = computed(() => this._config().languages);

  asset(path: string): string { return `/tenants/${this.id()}/${path}`; }
  language(code: string) { return this.languages().find(l => l.code === code); }
}
```
Theme and favicon are no longer applied at runtime: each build bundles exactly one tenant theme and copies that tenant's favicon to the site root (section 4.3).

---

## 4. Styling: Less + CSS variables (white-label)

### 4.1 Default tokens (`src/styles/_tokens.less`)
```less
:root {
  /* Surfaces: base is always white */
  --color-bg: #ffffff;
  --color-surface: #ffffff;
  --color-surface-alt: #f6f7f9;
  --color-border: #e3e6ea;

  /* Text (passes 4.5:1 on white) */
  --color-text: #1a1d23;
  --color-text-muted: #545b66;

  /* Brand (tenants override) */
  --color-primary: #1f5eff;
  --color-primary-contrast: #ffffff;
  --color-primary-hover: #1848c7;
  --color-accent: #0f9d76;
  --color-focus: #1f5eff;
  --color-danger: #c62828;

  /* Typography (per-script fonts) */
  --font-latin: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-hebrew: 'Heebo', 'Assistant', system-ui, sans-serif;
  --font-arabic: 'Noto Kufi Arabic', 'Tajawal', system-ui, sans-serif;
  --font-body: var(--font-latin);
  --fs-100: clamp(0.875rem, 0.84rem + 0.15vw, 0.95rem);
  --fs-200: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --fs-300: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --fs-400: clamp(1.5rem, 1.25rem + 1.1vw, 2.125rem);
  --fs-500: clamp(2rem, 1.5rem + 2.2vw, 3.25rem);
  --lh-body: 1.6;

  /* Spacing (8px scale), radius, shadow, motion */
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem;
  --space-6: 1.5rem; --space-8: 2rem; --space-12: 3rem; --space-16: 4rem;
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px; --radius-pill: 999px;
  --shadow-sm: 0 1px 2px rgb(16 24 40 / 0.06);
  --shadow-md: 0 8px 24px rgb(16 24 40 / 0.08);
  --container-max: 1200px;
  --header-height: 64px;
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --dur: 200ms;
  --focus-ring: 3px solid var(--color-focus);
  --target-min: 44px; /* exceeds WCAG 2.2 2.5.8 minimum of 24px */
}

:root[dir='ltr'] { --dir: 1; }
:root[dir='rtl'] { --dir: -1; }
:root[lang='he'] { --font-body: var(--font-hebrew); }
:root[lang='ar'] { --font-body: var(--font-arabic); }
```

### 4.2 Tenant theme (`src/tenants/acme/theme.less`) — overrides only
```less
:root {
  --color-primary: #7a1fa2;
  --color-primary-hover: #5f1880;
  --color-focus: #7a1fa2;
  --color-accent: #e0631a;
  --radius-md: 4px;
}
```
Never override `--color-bg` away from white. Every tenant color used for text or UI boundaries must pass contrast on white (4.5:1 text, 3:1 non-text).

### 4.3 One build configuration per tenant (`angular.json`)
Each configuration sets the tenant's theme, assets, `ACTIVE_TENANT` replacement and output folder. Configuration values **replace** the base arrays, so list `styles` and `assets` in full.
```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "server": "src/main.server.ts",
    "outputMode": "static",
    "index": "src/index.html",
    "tsConfig": "tsconfig.app.json",
    "stylePreprocessorOptions": { "includePaths": ["src/styles"] },
    "styles": ["src/styles/styles.less", "src/tenants/default/theme.less"],
    "assets": [
      { "glob": "**/*", "input": "public/i18n", "output": "i18n" },
      { "glob": "**/*", "input": "public/tenants/default", "output": "tenants/default" },
      { "glob": "favicon.ico", "input": "public/tenants/default", "output": "/" }
    ],
    "outputPath": "dist/default"
  },
  "configurations": {
    "production": { "outputHashing": "all", "budgets": [ { "type": "initial", "maximumWarning": "400kB", "maximumError": "600kB" } ] },
    "development": { "optimization": false, "extractLicenses": false, "sourceMap": true },
    "acme": {
      "outputPath": "dist/acme",
      "fileReplacements": [
        { "replace": "src/app/core/tenant/active-tenant.ts", "with": "src/tenants/acme/active-tenant.ts" }
      ],
      "styles": ["src/styles/styles.less", "src/tenants/acme/theme.less"],
      "assets": [
        { "glob": "**/*", "input": "public/i18n", "output": "i18n" },
        { "glob": "**/*", "input": "public/tenants/acme", "output": "tenants/acme" },
        { "glob": "favicon.ico", "input": "public/tenants/acme", "output": "/" }
      ]
    }
  }
},
"serve": {
  "builder": "@angular/build:dev-server",
  "configurations": {
    "development": { "buildTarget": "app:build:development" },
    "acme": { "buildTarget": "app:build:development,acme" }
  },
  "defaultConfiguration": "development"
}
```
- Build: `ng build -c production,acme`. Develop: `ng serve -c acme`.
- The theme is compiled into the global stylesheet, so there is no flash of the default theme and no runtime `<link>` injection.
- Only the active tenant's assets are copied, so one tenant's files never leak into another tenant's site.
- With many tenants, generate these configurations from `public/tenants/*/` with a small script instead of editing by hand; `check:tenants` (13.6) verifies they exist.

### 4.4 Mobile-first breakpoints (`_breakpoints.less`)
```less
@bp-sm: 36em;  // 576px  large phones
@bp-md: 48em;  // 768px  tablets
@bp-lg: 64em;  // 1024px small desktop / landscape tablet
@bp-xl: 80em;  // 1280px desktop

.from-sm(@rules) { @media (min-width: @bp-sm) { @rules(); } }
.from-md(@rules) { @media (min-width: @bp-md) { @rules(); } }
.from-lg(@rules) { @media (min-width: @bp-lg) { @rules(); } }
.from-xl(@rules) { @media (min-width: @bp-xl) { @rules(); } }
```
Usage in a component `.less` file:
```less
@import '_breakpoints';
.grid {
  display: grid; gap: var(--space-4); grid-template-columns: 1fr;
  .from-md({ grid-template-columns: repeat(2, 1fr); });
  .from-lg({ grid-template-columns: repeat(3, 1fr); gap: var(--space-6); });
}
```
Never write `max-width` media queries for layout. Prefer container queries (`container-type: inline-size`) for reusable cards.

### 4.5 RTL/LTR rules
- Use logical properties only: `margin-inline-start`, `padding-inline`, `inset-inline-end`, `border-inline-start`, `text-align: start`. Never `left`/`right` for layout.
- Directional icons (arrows, chevrons) flip with `:dir(rtl) .icon-arrow { transform: scaleX(-1); }`. Do not flip logos, media controls or checkmarks.
- Flex/grid follow `dir` automatically; do not reverse manually.
- Numbers, phone numbers, emails inside RTL text: wrap in `<bdi>` or `<span dir="ltr">`.
- Transforms/animations that move horizontally: multiply by `var(--dir)` (defined in tokens).

### 4.6 Base (`_base.less`)
```less
html { background: var(--color-bg); scroll-padding-top: calc(var(--header-height) + var(--space-4)); }
body {
  margin: 0; background: var(--color-bg); color: var(--color-text);
  font-family: var(--font-body); font-size: var(--fs-200); line-height: var(--lh-body);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
:focus-visible { outline: var(--focus-ring); outline-offset: 2px; border-radius: var(--radius-sm); }
a { color: var(--color-primary); text-underline-offset: 0.2em; }
img { max-width: 100%; height: auto; display: block; }
.container { width: min(100% - 2 * var(--space-4), var(--container-max)); margin-inline: auto; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```
`scroll-padding-top` keeps focused elements from hiding under the sticky header (WCAG 2.4.11).

---

## 5. App config, routing, lazy loading, prerendering

### 5.1 Browser config
```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    provideHttpClient(withFetch(), withInterceptors([httpErrorInterceptor])),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),   // hydrates the prerendered HTML
    provideTranslateService({
      loader: { provide: TranslateLoader, useClass: TenantTranslateLoader },
      fallbackLang: 'en',
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
```
No `provideAppInitializer` is needed: the tenant is a build-time constant. Zoneless change detection is the default for new v21 apps; use signals and `OnPush` semantics everywhere. (Older ngx-translate versions use `defaultLanguage` instead of `fallbackLang`.)

### 5.2 Routes
```ts
// app.routes.ts — language-prefixed URLs: /he/about, /en/about
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => inject(I18nService).initialLang() },  // dev fallback; the host redirects "/" in production
  {
    path: ':lang',
    canMatch: [langGuard],                 // rejects languages the tenant does not support
    resolve: { lang: langResolver },       // loads translations, sets <html lang dir>
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/home/home.page').then(m => m.HomePage),
        data: { seo: { titleKey: 'home.seo.title', descriptionKey: 'home.seo.description' } } },
      { path: 'about', loadComponent: () => import('./features/about/about.page').then(m => m.AboutPage),
        data: { seo: { titleKey: 'about.seo.title', descriptionKey: 'about.seo.description' } } },
      { path: 'services', loadChildren: () => import('./features/services/services.routes') },
      { path: 'contact', loadComponent: () => import('./features/contact/contact.page').then(m => m.ContactPage) },
      { path: 'not-found', loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage),
        data: { seo: { titleKey: 'notFound.seo.title', robots: 'noindex' } } },
      { path: '**', loadComponent: () => import('./features/not-found/not-found.page').then(m => m.NotFoundPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
```
`not-found` is an explicit, prerendered route so the static host can serve it with a real `404` status (section 14.2).

### 5.3 Build-time prerendering (no runtime server)
`src/app/routes.manifest.json` — the single list of prerendered paths, shared by Angular and the SEO script:
```json
["", "about", "services", "services/web-design", "contact", "not-found"]
```
```ts
// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';
import paths from './routes.manifest.json';
import { ACTIVE_TENANT } from './core/tenant/active-tenant';

const langParams = async () => ACTIVE_TENANT.languages.map(l => ({ lang: l.code }));

export const serverRoutes: ServerRoute[] = [
  ...paths.map((p): ServerRoute => ({
    path: p ? `:lang/${p}` : ':lang',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: langParams,
  })),
  { path: '**', renderMode: RenderMode.Client },   // anything else falls back to client rendering
];
```
```ts
// app.config.server.ts — used only while prerendering during `ng build`
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: TranslateLoader, useClass: FsTranslateLoader },   // read JSON from disk, no HTTP at build time
  ],
};
export const config = mergeApplicationConfig(appConfig, serverConfig);
```
- Delete `src/server.ts` and any `ssr.entry` option that `ng add @angular/ssr` created; `outputMode: "static"` needs only `main.server.ts`.
- The build output is `dist/<tenant>/browser/<lang>/<path>/index.html` for every manifest path × tenant language, plus `index.csr.html` for client-only routes. There is no `server/` folder to deploy.
- Code that runs during prerender must not touch `window`, `localStorage` or `navigator` without an `isPlatformBrowser` check, and must not depend on HTTP calls to relative URLs (there is no server to answer them). Data needed in the HTML comes from imported JSON or from disk.
- Content that changes often (prices, availability) is fetched in the browser after hydration; the prerendered HTML holds the stable content. Rebuild and redeploy to update static content.

Inside pages use `@defer (on viewport)` for below-the-fold sections and heavy widgets, and the built-in control flow (`@if`, `@for` with `track`, `@switch`). Plain `@defer` blocks prerender only their `@placeholder`; for content that must be in the HTML use incremental hydration (`@defer (hydrate on viewport)`) or keep it outside `@defer`.

---

## 6. i18n and direction

```ts
// core/i18n/tenant-translate.loader.ts — browser: shared strings + tenant overrides over HTTP
@Injectable()
export class TenantTranslateLoader implements TranslateLoader {
  private http = inject(HttpClient);
  private tenant = inject(TenantService);
  getTranslation(lang: string) {
    const shared = this.http.get<Record<string, unknown>>(`/i18n/${lang}.json`).pipe(catchError(() => of({})));
    const own = this.http.get<Record<string, unknown>>(`/tenants/${this.tenant.id()}/i18n/${lang}.json`).pipe(catchError(() => of({})));
    return forkJoin([shared, own]).pipe(map(([a, b]) => deepMerge(a, b)));
  }
}
```
```ts
// core/i18n/fs-translate.loader.ts — prerender only (imported from app.config.server.ts, never from browser code)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class FsTranslateLoader implements TranslateLoader {
  private tenant = inject(TenantService);
  private read(rel: string): Record<string, unknown> {
    try { return JSON.parse(readFileSync(join(process.cwd(), 'public', rel), 'utf8')); } catch { return {}; }
  }
  getTranslation(lang: string) {
    return of(deepMerge(this.read(`i18n/${lang}.json`), this.read(`tenants/${this.tenant.id()}/i18n/${lang}.json`)));
  }
}
```
Optional: pass the loaded translations to the browser through `TransferState` so hydration does not re-download them.

```ts
// core/i18n/i18n.service.ts
@Injectable({ providedIn: 'root' })
export class I18nService {
  private translate = inject(TranslateService);
  private tenant = inject(TenantService);
  private doc = inject(DOCUMENT);
  readonly lang = signal('en');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');

  initialLang(): string {
    const supported = this.tenant.languages().map(l => l.code);
    const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : '';
    return supported.includes(nav) ? nav : this.tenant.config().defaultLang;
  }

  use(code: string) {
    const def = this.tenant.language(code)!;
    this.lang.set(code);
    this.dir.set(def.dir);
    const html = this.doc.documentElement;
    html.lang = code;          // written into the prerendered HTML too
    html.dir = def.dir;
    return this.translate.use(code);
  }
}
```
```ts
export const langGuard: CanMatchFn = (_r, segments) =>
  inject(TenantService).languages().some(l => l.code === segments[0]?.path);
export const langResolver: ResolveFn<string> = route => {
  const lang = route.paramMap.get('lang')!;
  return inject(I18nService).use(lang).pipe(map(() => lang));
};
```
- Translation keys are namespaced by feature: `nav.*`, `home.*`, `home.seo.*`, `common.*`, `a11y.*`.
- Use the `translate` pipe in templates; for attributes `[attr.aria-label]="'a11y.openMenu' | translate"`.
- If the Angular CDK is used, wrap the shell in `[dir]="i18n.dir()"` so CDK overlays follow direction.
- The language switcher keeps the current path and swaps only the `:lang` segment, uses each language's native label, and sets `lang`/`hreflang` on each link.

---

## 7. Layout, header and responsive navbar

Shell structure (landmarks are mandatory):
```html
<app-skip-link />
<app-header />            <!-- <header> with logo + <nav> -->
<main id="main" tabindex="-1"><router-outlet /></main>
<app-footer />            <!-- <footer> -->
```

Navbar behaviour:
- Mobile (< `@bp-lg`): logo + hamburger button; menu opens as a full-height panel sliding from the inline-end side (right in LTR, left in RTL).
- Desktop (>= `@bp-lg`): horizontal links, language switcher and CTA in the bar; hamburger hidden.
- Disclosure pattern: `<button aria-expanded aria-controls>`; Escape closes and returns focus to the button; menu closes on navigation; body scroll locked while open; content behind gets `inert`.
- Current page link: `routerLinkActive="is-active" ariaCurrentWhenActive="page"`.
- Sticky header, white background, subtle shadow after scroll.

```ts
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LangSwitcherComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.less',
  host: { '(document:keydown.escape)': 'close(true)' },
})
export class NavbarComponent {
  protected tenant = inject(TenantService);
  protected i18n = inject(I18nService);
  protected open = signal(false);
  private toggleBtn = viewChild.required<ElementRef<HTMLButtonElement>>('toggle');

  constructor() {
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.close(false));
  }
  toggle() { this.open.update(v => !v); }
  close(restoreFocus: boolean) {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.toggleBtn().nativeElement.focus();
  }
}
```
```html
<nav class="nav" [attr.aria-label]="'a11y.mainNav' | translate">
  <a class="brand" [routerLink]="['/', i18n.lang()]">
    <img [src]="tenant.config().logo.src" [width]="tenant.config().logo.width" [height]="tenant.config().logo.height"
         [alt]="tenant.config().name" />
  </a>
  <button #toggle class="nav__toggle" type="button" aria-controls="primary-menu"
          [attr.aria-expanded]="open()" (click)="toggle()">
    <span class="visually-hidden">{{ (open() ? 'a11y.closeMenu' : 'a11y.openMenu') | translate }}</span>
    <span class="burger" aria-hidden="true"></span>
  </button>
  <div id="primary-menu" class="nav__menu" [class.is-open]="open()">
    <ul role="list">
      @for (item of tenant.config().nav; track item.path) {
        <li><a [routerLink]="['/', i18n.lang(), item.path]" routerLinkActive="is-active"
               [routerLinkActiveOptions]="{ exact: item.path === '' }" ariaCurrentWhenActive="page">
          {{ item.labelKey | translate }}</a></li>
      }
    </ul>
    <app-lang-switcher />
  </div>
</nav>
```
```less
@import '_breakpoints';
.nav { display: flex; align-items: center; justify-content: space-between; min-block-size: var(--header-height); }
.nav__toggle { inline-size: var(--target-min); block-size: var(--target-min); display: grid; place-items: center;
  background: none; border: 0; cursor: pointer; .from-lg({ display: none; }); }
.nav__menu {
  position: fixed; inset-block: var(--header-height) 0; inset-inline-end: 0; inline-size: min(85vw, 360px);
  background: var(--color-surface); box-shadow: var(--shadow-md); padding: var(--space-6);
  transform: translateX(calc(100% * var(--dir))); visibility: hidden;
  transition: transform var(--dur) var(--ease), visibility 0s linear var(--dur);
  &.is-open { transform: none; visibility: visible; transition-delay: 0s; }
  a { display: flex; align-items: center; min-block-size: var(--target-min); padding-inline: var(--space-3);
      color: var(--color-text); text-decoration: none; border-radius: var(--radius-sm); }
  a.is-active { color: var(--color-primary); font-weight: 600; }
  .from-lg({ position: static; inline-size: auto; transform: none; visibility: visible; box-shadow: none; padding: 0;
             display: flex; align-items: center; gap: var(--space-6);
             ul { display: flex; gap: var(--space-2); } });
}
```
(`visibility: hidden` removes the closed mobile menu from the tab order and accessibility tree.)

---

## 8. SEO and AEO

`SeoService` runs on every `NavigationEnd` (during prerender and in the browser), reads the deepest route's `data.seo` and the active tenant/language, and sets:
- `<title>` ("Page title | Tenant name"), `meta description`, `robots`.
- `link rel=canonical` = `siteUrl + /{lang}/{path}` (no query strings, no trailing slash; the host serves `/{lang}/{path}/index.html` without redirecting).
- `link rel=alternate hreflang=...` for every tenant language plus `x-default` (default language).
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:locale` e.g. `he_IL`, `og:locale:alternate`) and Twitter card.
- JSON-LD `<script type="application/ld+json">`: `Organization` + `WebSite` on every page, `BreadcrumbList` on inner pages, `FAQPage` where a FAQ section exists, `Service`/`Product`/`Article` where relevant. Replace (not duplicate) on navigation.

```ts
private setJsonLd(id: string, data: object) {
  let el = this.doc.getElementById(id) as HTMLScriptElement | null;
  if (!el) { el = this.doc.createElement('script'); el.type = 'application/ld+json'; el.id = id; this.doc.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
}
```
Because these tags are written while prerendering, they are in the static HTML that crawlers, AI answer engines and social link previews receive, with no JavaScript required.

Build-generated files (no server routes). After `ng build -c production,<id>`, run `node scripts/generate-seo.mjs <id>`:
```js
// scripts/generate-seo.mjs
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const id = process.argv[2];
const t = JSON.parse(readFileSync(`public/tenants/${id}/tenant.json`, 'utf8'));
const paths = JSON.parse(readFileSync('src/app/routes.manifest.json', 'utf8')).filter(p => p !== 'not-found');
const out = `dist/${id}/browser`;

const url = (lang, p) => `${t.siteUrl}/${lang}${p ? '/' + p : ''}`;
const alternates = p => [
  ...t.languages.map(l => `<xhtml:link rel="alternate" hreflang="${l.code}" href="${url(l.code, p)}"/>`),
  `<xhtml:link rel="alternate" hreflang="x-default" href="${url(t.defaultLang, p)}"/>`,
].join('');
const lastmod = new Date().toISOString().slice(0, 10);
const entries = paths.flatMap(p => t.languages.map(l =>
  `<url><loc>${url(l.code, p)}</loc><lastmod>${lastmod}</lastmod>${alternates(p)}</url>`));

writeFileSync(`${out}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>\n`);
writeFileSync(`${out}/robots.txt`, `User-agent: *\nAllow: /\nSitemap: ${t.siteUrl}/sitemap.xml\n`);
copyFileSync(`public/tenants/${id}/llms.txt`, `${out}/llms.txt`);
```
Keep the sitemap/robots builders as exported pure functions in a small module so they can be unit-tested (13.5).

Also required:
- Every indexable route × language is in `routes.manifest.json` and therefore prerendered; never put core content only behind client-side fetches or plain `@defer`.
- One `<h1>` per page, logical heading order, semantic elements (`article`, `section` with headings, `nav`, `aside`, `time datetime`).
- `NgOptimizedImage` (`ngSrc`, width/height, `priority` on the LCP hero image), descriptive translated `alt`.
- Core Web Vitals: lazy routes, `@defer`, font `display=swap` and preconnect, no layout shift (reserve image sizes), long-lived cache headers on hashed assets (14.2).

AEO content rules (for answer engines and AI assistants):
- Answer-first: start key sections with a 1–2 sentence direct answer, then details.
- Use question-style headings for FAQs ("How much does X cost?") with matching `FAQPage` JSON-LD.
- Clear entity facts (company name, location, services, contact) consistent across page text, JSON-LD and `llms.txt`.
- Show last-updated dates (`<time>`) and authorship where relevant.

---

## 9. Error logging to Firebase (Firestore)

Collection: `errorLogs` (one collection, `tenantId` field for filtering).

```ts
// core/logging/error-log.service.ts
@Injectable({ providedIn: 'root' })
export class ErrorLogService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private tenant = inject(TenantService);
  private recent = new Map<string, number>();
  private dbPromise?: Promise<import('firebase/firestore').Firestore>;

  private db() {
    return this.dbPromise ??= (async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');
      const app = getApps()[0] ?? initializeApp(environment.firebase);
      return getFirestore(app);
    })();
  }

  async log(error: unknown, context: { source: 'global' | 'http' | 'manual'; extra?: Record<string, unknown> }) {
    const err = error instanceof Error ? error : new Error(String(error));
    const key = `${err.name}:${err.message}`;
    const now = Date.now();
    if ((this.recent.get(key) ?? 0) > now - 60_000) return;   // dedupe 1 min
    if (this.recent.size > 50) return;                         // per-session cap
    this.recent.set(key, now);
    if (!this.isBrowser) { console.error(err); return; }        // prerender runs at build time: surface in build output
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(await this.db(), 'errorLogs'), {
        tenantId: this.tenant.id(),
        message: err.message.slice(0, 1000),
        name: err.name,
        stack: (err.stack ?? '').slice(0, 4000),
        source: context.source,
        url: location.pathname,             // no query string: avoid PII
        lang: document.documentElement.lang,
        userAgent: navigator.userAgent.slice(0, 300),
        appVersion: environment.version,
        extra: context.extra ?? null,
        createdAt: serverTimestamp(),
      });
    } catch { /* never throw from the logger */ }
  }
}
```
```ts
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(ErrorLogService);
  handleError(error: unknown) { console.error(error); this.logger.log(error, { source: 'global' }); }
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(ErrorLogService);
  return next(req).pipe(catchError((e: HttpErrorResponse) => {
    if (e.status === 0 || e.status >= 500) {
      logger.log(new Error(`HTTP ${e.status} ${req.method} ${req.url.split('?')[0]}`), { source: 'http', extra: { status: e.status } });
    }
    return throwError(() => e);
  }));
};
```
Treat errors printed during `ng build` prerendering as build failures in CI (fail the job if the build log contains `ERROR`).

Firestore rules (write-only from clients, validated):
```
match /errorLogs/{id} {
  allow create: if request.resource.data.keys().hasOnly(['tenantId','message','name','stack','source','url','lang','userAgent','appVersion','extra','createdAt'])
    && request.resource.data.message is string && request.resource.data.message.size() <= 1000
    && request.resource.data.stack.size() <= 4000
    && request.resource.data.createdAt == request.time;
  allow read, update, delete: if false;
}
```
Enable Firebase App Check to limit abuse. Firebase is imported dynamically so it never enters the initial bundle. Never log form values, tokens, emails or full URLs with query strings.

---

## 10. Accessibility — WCAG 2.2 AA checklist

Apply to every component; pay special attention to the criteria new in 2.2:
- **2.4.11 Focus Not Obscured (Minimum)**: sticky header must not cover focused elements (`scroll-padding-top`, closed menus are `visibility:hidden`).
- **2.4.13 Focus Appearance (AAA, adopt anyway)**: 3px focus outline with ≥3:1 contrast via `--color-focus`.
- **2.5.7 Dragging Movements**: any drag (sliders, carousels) has buttons as an alternative.
- **2.5.8 Target Size (Minimum)**: interactive targets ≥24×24 CSS px; this project uses 44px.
- **3.2.6 Consistent Help**: contact/help link in the same place (footer + header CTA) on every page.
- **3.3.7 Redundant Entry**: do not ask for the same info twice in a flow; prefill or offer "same as above".
- **3.3.8 Accessible Authentication (Minimum)**: no cognitive tests; allow paste and password managers (`autocomplete`).

Core requirements:
- Skip link to `#main` as the first focusable element; on route change move focus to `<main>` or the page `<h1>` and announce the new title with `LiveAnnouncer` (or an `aria-live="polite"` region).
- Landmarks: one `header`, `nav` (labelled), `main`, `footer`.
- `<html lang dir>` always correct; inline foreign-language text gets its own `lang`.
- Contrast: text 4.5:1 (large text 3:1), UI components and icons 3:1 — verify every tenant palette against white.
- Everything keyboard operable, logical tab order matches visual order in both LTR and RTL; no keyboard traps.
- Forms: visible `<label>` for each field, `autocomplete` tokens, errors in text linked with `aria-describedby`, `aria-invalid`, error summary focused on submit.
- Images: meaningful `alt` (translated) or `alt=""` for decorative; SVG icons `aria-hidden="true"`, icon-only buttons have an accessible name.
- Content reflows at 320px width and 400% zoom without horizontal scroll (1.4.10); text spacing overrides do not break layout (1.4.12).
- Motion respects `prefers-reduced-motion`; no auto-playing carousels without pause.
- Use native elements first (`button`, `a`, `details`, `dialog`); add ARIA only when needed. Angular Aria / CDK a11y utilities (FocusTrap, LiveAnnouncer) are allowed when available in the installed version.

---

## 11. Verification before delivering

1. For each tenant: `ng build -c production,<id>` succeeds with no prerender errors, then `node scripts/generate-seo.mjs <id>`. `dist/<id>/browser/` contains `<lang>/<path>/index.html` for every manifest path × language, `sitemap.xml`, `robots.txt`, `llms.txt`, and no `server/` output. Initial bundle within budget.
2. Serve each build with the static host config (`deploy/Caddyfile.test`, or `ng serve -c <id>` while developing) and check each language:
   - Correct logo, colors, favicon, translations; white background; no other tenant's assets in the output folder.
   - `<html lang dir>` correct; layout mirrors in RTL with no left/right leftovers (`grep -rnE "(margin|padding)-(left|right)|\b(left|right):" src` should return nothing for layout).
   - Mobile (360px), tablet (768px), desktop (1280px+): navbar works by mouse, touch and keyboard; Escape closes; focus returns.
   - `/` redirects to the default language; an unknown URL returns status 404 with the translated not-found page.
3. Open the static HTML files (or view page source) and confirm title, description, canonical, hreflang, OG tags, JSON-LD and the main content are present without JavaScript; validate JSON-LD with Google's Rich Results Test / schema.org validator.
4. Automated a11y: Playwright + `@axe-core/playwright` with tags `wcag2a, wcag2aa, wcag21aa, wcag22aa` on every route × language; zero violations. Enable angular-eslint template accessibility rules.
5. Lighthouse: Performance ≥90, Accessibility 100, Best Practices ≥95, SEO 100 on mobile.
6. Trigger a test error in the browser and confirm a document appears in Firestore `errorLogs` with the right `tenantId`.

## 12. Adding a new tenant (checklist)
1. `src/tenants/<id>/theme.less` with variable overrides (contrast-checked on white).
2. `src/tenants/<id>/active-tenant.ts` importing `@public/tenants/<id>/tenant.json`.
3. `angular.json`: a `<id>` build configuration (outputPath, fileReplacements, styles, assets) and a `<id>` serve configuration (section 4.3).
4. `public/tenants/<id>/`: `tenant.json`, `logo.svg`, `favicon.ico`, `og-image.jpg` (1200×630), `images/`, `i18n/<lang>.json`, `llms.txt`.
5. Map its domains in `public/tenants/tenants.json` and add its site block to `deploy/Caddyfile` and `deploy/Caddyfile.test` (section 14).
6. Add the tenant to the CI build matrix and the e2e matrix (section 13.8), and run `npm run check:i18n`, `npm run check:tenants` and `npm run check:contrast`.
7. Run section 11 for that tenant.

---

## 13. Testing best practices

### 13.1 Tooling and test pyramid
| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest (default runner for new Angular 21 projects, `ng test`) + TestBed | services, guards, resolvers, interceptors, pipes, utilities, server routes, SEO builders |
| Component | TestBed + `@testing-library/angular` (or CDK component harnesses) | rendering, interaction, ARIA states, i18n, RTL |
| Integration | `RouterTestingHarness` | lazy routes, language prefix, guards + resolvers together |
| Static checks | Node scripts + ESLint + Stylelint | translation keys, tenant config + build configs, contrast, no physical CSS properties |
| E2E | Playwright + `@axe-core/playwright` | journeys per tenant × language × viewport against the static build, a11y, prerendered HTML, visual regression |
| Rules | Firebase Emulator + `@firebase/rules-unit-testing` | Firestore `errorLogs` rules |

- If the project still uses Karma/Jasmine, keep it; the patterns are the same (`jasmine.createSpy` instead of `vi.fn`).
- Spec files live next to the code (`navbar.component.ts` + `navbar.component.spec.ts`). Shared helpers live in `src/testing/`.
- Coverage thresholds: `core/` ≥ 90% lines, overall ≥ 80%. Coverage is a floor, not the goal.
- No real network, Firebase or timers in unit/component tests.

### 13.2 Shared test helpers (`src/testing/`)
```ts
// src/testing/tenant.fixtures.ts
export const TENANT_LTR: TenantConfig = {
  id: 'default', name: 'Default Co', defaultLang: 'en', siteUrl: 'https://default.test',
  languages: [{ code: 'en', dir: 'ltr', label: 'English' }, { code: 'he', dir: 'rtl', label: 'עברית' }],
  logo: { src: '/tenants/default/logo.svg', width: 140, height: 40 },
  nav: [{ path: '', labelKey: 'nav.home' }, { path: 'about', labelKey: 'nav.about' }],
  seo: { ogImage: '/tenants/default/og-image.jpg' }, contact: { email: 'a@default.test' }, social: [],
};
export const TENANT_RTL: TenantConfig = { ...TENANT_LTR, id: 'acme', name: 'Acme', defaultLang: 'he' };

export function provideTestTenant(cfg: TenantConfig = TENANT_LTR): Provider[] {
  const config = signal(cfg);
  return [{
    provide: TenantService,
    useValue: {
      config,
      id: computed(() => config().id),
      languages: computed(() => config().languages),
      language: (c: string) => config().languages.find(l => l.code === c),
      asset: (p: string) => `/tenants/${config().id}/${p}`,
    },
  }];
}
```
```ts
// src/testing/i18n.ts — in-memory translations, no HTTP
class StaticLoader implements TranslateLoader {
  constructor(private t: Record<string, object>) {}
  getTranslation(lang: string) { return of(this.t[lang] ?? {}); }
}
export const TEST_TRANSLATIONS = {
  en: { nav: { home: 'Home', about: 'About' }, a11y: { mainNav: 'Main', openMenu: 'Open menu', closeMenu: 'Close menu' } },
  he: { nav: { home: 'בית', about: 'אודות' }, a11y: { mainNav: 'ראשי', openMenu: 'פתח תפריט', closeMenu: 'סגור תפריט' } },
};
export function provideTestTranslations(lang = 'en', t = TEST_TRANSLATIONS) {
  return provideTranslateService({ loader: { provide: TranslateLoader, useValue: new StaticLoader(t) }, fallbackLang: 'en', lang });
}
export function provideTestI18n(lang = 'en', dir: 'ltr' | 'rtl' = 'ltr') {
  return { provide: I18nService, useValue: { lang: signal(lang), dir: signal(dir), use: vi.fn(() => of(lang)) } };
}
```
(If your ngx-translate version has no `lang` option, call `TestBed.inject(TranslateService).use(lang)` in the test setup.)

### 13.3 Services
Use `provideHttpClient()` + `provideHttpClientTesting()` wherever HTTP is involved, flush responses with `HttpTestingController`, and always `verify()` in `afterEach`.

```ts
describe('TenantService', () => {
  it('exposes the build-time tenant', () => {
    const s = TestBed.inject(TenantService);
    expect(s.id()).toBe(ACTIVE_TENANT.id);
    expect(s.language(ACTIVE_TENANT.defaultLang)).toBeDefined();
    expect(s.asset('logo.svg')).toBe(`/tenants/${ACTIVE_TENANT.id}/logo.svg`);
  });
});
```
Tenant-specific behavior is covered by the e2e matrix (each tenant is its own build), so unit tests use `provideTestTenant` rather than switching `ACTIVE_TENANT`.

```ts
describe('I18nService', () => {
  it.each([['he', 'rtl'], ['en', 'ltr']])('use(%s) sets <html lang> and dir=%s', async (lang, dir) => {
    TestBed.configureTestingModule({ providers: [provideTestTenant(), provideTestTranslations()] });
    await firstValueFrom(TestBed.inject(I18nService).use(lang));
    expect(document.documentElement.lang).toBe(lang);
    expect(document.documentElement.dir).toBe(dir);
  });
});
```

`TenantTranslateLoader`: assert tenant keys override shared keys, nested objects are deep-merged, and a 404 on the tenant file still returns the shared strings.

`FsTranslateLoader`: mock `node:fs` (`vi.mock('node:fs')`) and assert the same merge rules, plus that a missing file returns `{}` instead of throwing.

`serverRoutes`:
```ts
it('prerenders every manifest path for every tenant language', async () => {
  const prerendered = serverRoutes.filter(r => r.renderMode === RenderMode.Prerender);
  expect(prerendered).toHaveLength(manifest.length);
  const params = await (prerendered[0] as any).getPrerenderParams();
  expect(params).toEqual(ACTIVE_TENANT.languages.map(l => ({ lang: l.code })));
});
```
Also assert every child path in `app.routes.ts` (except `**`) appears in `routes.manifest.json`, so a new page cannot silently skip prerendering.

`SeoService`: navigate with `RouterTestingHarness`, then assert `document.title`, `meta[name=description]`, `link[rel=canonical]`, one `link[hreflang]` per tenant language + `x-default`, and exactly one JSON-LD script per id after two navigations (no duplicates).

`ErrorLogService` — mock Firebase at the module boundary:
```ts
const addDoc = vi.fn().mockResolvedValue({});
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})), getApps: vi.fn(() => []) }));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})), collection: vi.fn((_db, name) => name),
  addDoc: (...a: unknown[]) => addDoc(...a), serverTimestamp: vi.fn(() => 'TS'),
}));

describe('ErrorLogService', () => {
  beforeEach(() => {
    addDoc.mockClear();
    TestBed.configureTestingModule({ providers: [provideTestTenant(TENANT_RTL)] });
  });

  it('writes a sanitized log with tenantId', async () => {
    await TestBed.inject(ErrorLogService).log(new Error('boom'), { source: 'manual' });
    expect(addDoc).toHaveBeenCalledWith('errorLogs', expect.objectContaining({ tenantId: 'acme', message: 'boom' }));
    expect(addDoc.mock.calls[0][1].url).not.toContain('?');
  });
  it('dedupes identical errors within a minute', async () => {
    const s = TestBed.inject(ErrorLogService);
    await s.log(new Error('x'), { source: 'manual' });
    await s.log(new Error('x'), { source: 'manual' });
    expect(addDoc).toHaveBeenCalledTimes(1);
  });
  it('never throws when Firestore fails', async () => {
    addDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(TestBed.inject(ErrorLogService).log(new Error('y'), { source: 'manual' })).resolves.toBeUndefined();
  });
  it('does not call Firestore while prerendering', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await TestBed.inject(ErrorLogService).log(new Error('z'), { source: 'manual' });
    expect(addDoc).not.toHaveBeenCalled();
  });
});
```

### 13.4 Guards, resolvers, interceptors (functional)
Run functional guards and resolvers inside `TestBed.runInInjectionContext`:
```ts
it('langGuard matches only tenant languages', () => {
  TestBed.configureTestingModule({ providers: provideTestTenant() });
  const run = (l: string) => TestBed.runInInjectionContext(() => langGuard({} as Route, [new UrlSegment(l, {})]));
  expect(run('he')).toBe(true);
  expect(run('fr')).toBe(false);
});
```
Interceptors: register with `provideHttpClient(withInterceptors([httpErrorInterceptor]))` + `provideHttpClientTesting()` and a mocked `ErrorLogService`:
```ts
it('logs 5xx, not 4xx, and rethrows', async () => {
  const log = vi.fn();
  TestBed.configureTestingModule({ providers: [
    provideHttpClient(withInterceptors([httpErrorInterceptor])), provideHttpClientTesting(),
    { provide: ErrorLogService, useValue: { log } },
  ]});
  const http = TestBed.inject(HttpClient), ctrl = TestBed.inject(HttpTestingController);

  const r500 = firstValueFrom(http.get('/api/x?token=secret'));
  ctrl.expectOne('/api/x?token=secret').flush(null, { status: 500, statusText: 'err' });
  await expect(r500).rejects.toBeInstanceOf(HttpErrorResponse);
  expect(log.mock.calls[0][0].message).not.toContain('token');

  const r404 = firstValueFrom(http.get('/api/y'));
  ctrl.expectOne('/api/y').flush(null, { status: 404, statusText: 'nf' });
  await expect(r404).rejects.toBeTruthy();
  expect(log).toHaveBeenCalledTimes(1);
});
```
Routing integration with the real lazy routes:
```ts
it('loads /he/about lazily and rejects unsupported languages', async () => {
  TestBed.configureTestingModule({ providers: [provideRouter(routes), provideTestTenant(), provideTestTranslations('he'), provideHttpClient(), provideHttpClientTesting()] });
  const harness = await RouterTestingHarness.create('/he/about');
  expect(harness.routeNativeElement?.querySelector('h1')).toBeTruthy();
  await harness.navigateByUrl('/fr/about');
  expect(TestBed.inject(Router).url).not.toContain('/fr');
});
```

### 13.5 Components
Principles:
- Test what the user sees and does: query by **role and accessible name** (`getByRole('button', { name: 'Open menu' })`), never by CSS class or component internals.
- Signal inputs: `fixture.componentRef.setInput('title', 'Hi')` (or `inputs` in Testing Library's `render`). Outputs: subscribe to the output and assert the emitted value.
- Zoneless apps: after an interaction `await fixture.whenStable()`; do not rely on zone-based auto change detection.
- Provide fakes for services at the boundary (`provideTestTenant`, `provideTestI18n`); never hit HTTP from a component test.
- Every component spec covers: renders with tenant data, interaction, ARIA states (`aria-expanded`, `aria-current`, labels), translated text (no raw keys like `nav.home` on screen), and RTL when the component is directional.
- Do not test private methods or snapshot whole DOM trees.

Navbar example (Testing Library):
```ts
async function setup(lang = 'en', dir: 'ltr' | 'rtl' = 'ltr') {
  const user = userEvent.setup();
  const view = await render(NavbarComponent, {
    providers: [provideRouter([]), provideTestTenant(), provideTestTranslations(lang), provideTestI18n(lang, dir)],
  });
  return { user, ...view };
}

it('opens and closes the menu with correct aria-expanded', async () => {
  const { user } = await setup();
  const toggle = screen.getByRole('button', { name: 'Open menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.click(toggle);
  expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
});

it('Escape closes the menu and returns focus to the toggle', async () => {
  const { user } = await setup();
  await user.click(screen.getByRole('button', { name: 'Open menu' }));
  await user.keyboard('{Escape}');
  const toggle = screen.getByRole('button', { name: 'Open menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveFocus();
});

it('renders translated tenant links and logo alt', async () => {
  await setup('he', 'rtl');
  expect(screen.getByRole('link', { name: 'אודות' })).toHaveAttribute('href', '/he/about');
  expect(screen.getByRole('img', { name: 'Default Co' })).toBeTruthy();
  expect(screen.queryByText(/^nav\./)).toBeNull();          // no untranslated keys
});
```
(`toHaveAttribute`/`toHaveFocus` come from `@testing-library/jest-dom/vitest`; import it in the test setup file.)

Other component patterns:
- **Language switcher**: hrefs swap only the `:lang` segment and keep the path; each link has `lang` and `hreflang`; the current language has `aria-current="true"`.
- **Forms**: submitting empty shows text errors, sets `aria-invalid="true"`, links errors via `aria-describedby`, and moves focus to the error summary.
- **`@defer` blocks**: configure `deferBlockBehavior: DeferBlockBehavior.Manual`, then `const [block] = await fixture.getDeferBlocks(); await block.render(DeferBlockState.Complete);` and assert the placeholder and loaded states.
- **Presentational components** (card, button, section): test inputs → DOM and outputs → events; keep them free of services so tests need no providers.
- **Optional unit-level a11y**: `vitest-axe` on the rendered element catches missing labels/roles; color contrast is only checked in e2e (jsdom has no layout).

Pipes and utilities (e.g. `deepMerge`, sitemap/robots builders, JSON-LD builders) are plain functions: test them without TestBed, with table-driven `it.each` cases (sitemap: one `<url>` per path × language, `x-default` alternate, `not-found` excluded).

### 13.6 Static checks (CI, no browser)
- `npm run check:i18n` — a Node script that, for shared `public/i18n/` and every `public/tenants/*/i18n/`: every language has the same keys as the default language, no empty strings, every `labelKey` in each `tenant.json` exists, and every route `seo.titleKey`/`descriptionKey` exists.
- `npm run check:tenants` — validate each `tenant.json` against a schema (e.g. zod or JSON Schema): `defaultLang` is in `languages`, RTL codes have `dir: "rtl"`, the logo file exists, `llms.txt` exists, every domain in `tenants.json` points to an existing folder, and every tenant folder has `src/tenants/<id>/active-tenant.ts`, a matching `angular.json` build + serve configuration, and a site block in `deploy/Caddyfile`.
- `npm run check:contrast` — read each `src/tenants/*/theme.less`, compute the WCAG contrast ratio of text/UI colors against `#ffffff`, fail below 4.5:1 (text) or 3:1 (focus, borders, icons).
```js
// contrast helper
const lum = hex => { const [r, g, b] = hex.match(/\w\w/g).map(h => parseInt(h, 16) / 255)
  .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
```
- **Stylelint** with `stylelint-use-logical` (`"csstools/use-logical": "always"`) on `**/*.less` to block `margin-left`, `right:` etc. This enforces RTL safety automatically.
- **ESLint** with angular-eslint template accessibility rules enabled (`@angular-eslint/template/accessibility`), plus a `no-restricted-imports` rule that forbids `node:*` imports outside `fs-translate.loader.ts` and `app.config.server.ts`.

### 13.7 Firestore rules tests
Run against the Firebase Emulator with `@firebase/rules-unit-testing`: an unauthenticated client can `create` a valid log; creating with an extra field, a too-long message, or a client-made timestamp fails; `read`, `update` and `delete` always fail.

### 13.8 End-to-end (Playwright)
- Projects for three viewports: mobile (`devices['Pixel 7']`), tablet (`devices['iPad Mini']`), desktop (1440×900).
- Run against the production static builds served by the real host config, so redirects, clean URLs, 404 handling and cache headers are tested too: `webServer: { command: 'caddy run --config deploy/Caddyfile.test', port: 8080 }`, with one `http://<tenant>.test:8080` site block per tenant pointing at `dist/<tenant>/browser`. Map the hosts to localhost: `launchOptions: { args: ['--host-resolver-rules=MAP *.test 127.0.0.1'] }`.
- Loop over a tenant × language matrix:

```ts
const matrix = [
  { tenant: 'default', host: 'http://default.test:8080', lang: 'en', dir: 'ltr', name: 'Default Co' },
  { tenant: 'acme',    host: 'http://acme.test:8080',    lang: 'he', dir: 'rtl', name: 'Acme Ltd' },
];

for (const m of matrix) {
  test.describe(`${m.tenant} / ${m.lang}`, () => {
    test('home: direction, landmarks, SEO', async ({ page }) => {
      await page.goto(`${m.host}/${m.lang}`);
      await expect(page.locator('html')).toHaveAttribute('dir', m.dir);
      await expect(page.locator('html')).toHaveAttribute('lang', m.lang);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`/${m.lang}$`));
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
    });

    test('WCAG 2.2 AA: no axe violations', async ({ page }) => {
      await page.goto(`${m.host}/${m.lang}`);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations).toEqual([]);
    });

    test('mobile menu works by keyboard', async ({ page }, info) => {
      test.skip(info.project.name === 'desktop');
      await page.goto(`${m.host}/${m.lang}`);
      await page.keyboard.press('Tab');                                  // skip link first
      await expect(page.getByRole('link', { name: /skip|דלג/i })).toBeFocused();
      const toggle = page.locator('button[aria-controls="primary-menu"]');
      await toggle.focus(); await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(toggle).toBeFocused();
    });

    test('prerendered HTML contains content and metadata without JS', async ({ request }) => {
      const html = await (await request.get(`${m.host}/${m.lang}`)).text();
      expect(html).toContain('application/ld+json');
      expect(html).toMatch(/hreflang="x-default"/);
      expect(html).toContain(`lang="${m.lang}"`);
      expect(html).toContain(m.name);
      expect(html).toMatch(/<h1[\s>]/);
    });

    test('static host: root redirect, 404 status, SEO files', async ({ request }) => {
      const root = await request.get(`${m.host}/`, { maxRedirects: 0 });
      expect(root.status()).toBe(302);
      expect((await request.get(`${m.host}/${m.lang}/no-such-page`)).status()).toBe(404);
      expect(await (await request.get(`${m.host}/sitemap.xml`)).text()).toContain(`/${m.lang}/about`);
      expect((await request.get(`${m.host}/robots.txt`)).ok()).toBe(true);
      expect((await request.get(`${m.host}/llms.txt`)).ok()).toBe(true);
    });

    test('visual regression', async ({ page }) => {
      await page.goto(`${m.host}/${m.lang}`);
      await expect(page).toHaveScreenshot(`${m.tenant}-${m.lang}-home.png`, { fullPage: true, animations: 'disabled' });
    });
  });
}
```
Also cover: the language switcher keeps the current page, the 404 page per language, focus moves to `<main>` after navigation, hydration produces no console errors (`page.on('console')`), the sticky header never covers a focused element (tab through the page and compare `getBoundingClientRect` of the focused element against the header), and 200% / 400% zoom at 320px width has no horizontal scroll.

### 13.9 CI pipeline order
1. `ng lint` + `stylelint "src/**/*.less"`
2. `npm run check:i18n && npm run check:tenants && npm run check:contrast`
3. `ng test --coverage` (fails below thresholds)
4. Firestore rules tests on the emulator
5. Build matrix, one job per tenant: `ng build -c production,<id>` (fail on prerender errors) → `node scripts/generate-seo.mjs <id>` → upload `dist/<id>/browser` as an artifact
6. Playwright: e2e + axe + visual, all projects × tenant matrix, against `deploy/Caddyfile.test`
7. Lighthouse CI on mobile for each tenant home page (budgets from section 11)
8. Deploy each tenant's `dist/<id>/browser` to its static site (section 14)

### 13.10 Rules of thumb
- New code ships with its spec; a bug fix starts with a failing regression test.
- Test behavior, not implementation; one clear reason to fail per test; descriptive names (`'Escape closes the menu and returns focus'`).
- Every UI test runs at least once in RTL for directional components.
- Deterministic tests: `vi.useFakeTimers()` for debounce/time, fixed dates, no real network or Firebase, no test order dependency.
- Keep fixtures small and shared in `src/testing/`; update them when `TenantConfig` changes so the type checker flags stale tests.
- Flaky tests are fixed or quarantined the same day, never retried silently.

---

## 14. Static hosting and deployment

### 14.1 What gets deployed
Only `dist/<id>/browser/` for each tenant: prerendered HTML per route × language, hashed JS/CSS, that tenant's assets, `favicon.ico`, `sitemap.xml`, `robots.txt`, `llms.txt`. Any static host works; the host must support (a) clean URLs (`/he/about` → `/he/about/index.html` without a redirect), (b) a redirect from `/` to the default language, (c) a custom 404 page served with status 404, and (d) per-path cache headers.

### 14.2 Caddy example (`deploy/Caddyfile`)
```
www.acme.com {
  redir https://acme.com{uri} 301
}

acme.com {
  root * /srv/sites/acme/browser
  encode zstd gzip

  @root path /
  redir @root /he 302                       # tenant defaultLang

  @hashed path_regexp \-[A-Z0-9]{8}\.(js|css)$
  header @hashed Cache-Control "public, max-age=31536000, immutable"
  @html path *.html / /*/
  header @html Cache-Control "no-cache"

  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
  }

  try_files {path} {path}/index.html
  file_server

  handle_errors 404 {
    rewrite * /he/not-found/index.html
    file_server
  }
}
```
- One site block per tenant; generate them from `public/tenants/tenants.json` + each `tenant.json` (`defaultLang`) with a script so domains and redirects never drift.
- Pages that use `RenderMode.Client` fall back to `index.csr.html`; if you add such routes, put `/index.csr.html` as the last `try_files` entry for their path prefix only, so unknown URLs still return 404.
- For a language-aware root redirect, match `Accept-Language` with a `header` matcher before the default `redir`.
- Equivalent setups: Nginx `try_files $uri $uri/index.html =404;` + `error_page 404`; Firebase Hosting multi-site with `cleanUrls: true` and a `404.html` per site; Cloudflare Pages / S3 + CloudFront with one bucket or project per tenant.

### 14.3 Content updates
Static content changes require a rebuild and redeploy of the affected tenant (CI on merge). Data that must be fresh between deploys is fetched in the browser after hydration and must not be needed for SEO.

### 14.4 CSR-only fallback (no prerendering at all)
Use only when `@angular/ssr` cannot be used. Remove `server`, `outputMode`, `main.server.ts`, `app.config.server.ts`, `app.routes.server.ts`, `FsTranslateLoader` and `provideClientHydration`; the host serves `index.html` for every path (`try_files {path} /index.html`).

Trade-offs to state to the user before choosing this:
- Google renders JavaScript (with delay), but most AI answer engines, social link previews and many other crawlers do not, so AEO and sharing previews degrade sharply.
- The host cannot return a real 404 for unknown URLs (soft 404s).
- Mitigation: give each tenant its own `index.html` (`"index": "src/tenants/<id>/index.html"` in its configuration) with static `<html lang dir>`, title, description, OG tags, `Organization`/`WebSite` JSON-LD and the default-language home content in a `<noscript>`-free fallback, and still generate `sitemap.xml`, `robots.txt` and `llms.txt` with `scripts/generate-seo.mjs`.
# SMB Automation — Developer Guide

The single source of truth for working on this repo, for people and for AI coding agents
(GitHub Copilot, Claude Code and Codex load this file automatically).
**Read it before changing code, and update it in the same change when you alter a convention,
a command, a collection or a file location.**

Detailed patterns live in the skills under `.github/skills/` (see [Skills](#skills)).
Where this file and a skill disagree, **this file wins**; it describes how this repo actually works.

---

## 1. What this project is

- Marketing website for **SMB Automation**: pages Home, Services, About, Contact, Not found,
  plus an n8n chatbot widget on Home.
- **Angular 21** (standalone components, signals, zoneless), **Less**, **ngx-translate 18**,
  **Firebase 13** (Firestore Lite only), **Vitest** via `ng test`.
- **Static site (SSG):** every page is prerendered at build time for every language
  (`outputMode: "static"`). There is **no Node server in production**; the `dist` folder is
  served by Caddy on the GCP VM.
- **White-label / multi-tenant at build time:** one build per tenant (company). The tenant is chosen
  by an Angular build configuration, not at runtime. Today there is one tenant: `default`.
- **Languages:** `en` (LTR, default) and `he` (RTL). URLs are always language-prefixed:
  `/en/contact`, `/he/contact`.
- Design rules: mobile-first, white background, WCAG 2.2 AA, SEO + AEO.

## 2. Commands

| Task                                       | Command                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Dev server (http://localhost:4200/en)      | `npm start`                                                              |
| Unit tests (once)                          | `npm test -- --watch=false`                                              |
| Translation / tenant / contrast checks     | `npm run check` (or `check:i18n`, `check:tenants`, `check:contrast`)     |
| Production build + sitemap/robots/llms.txt | `npm run build` → `dist/default/browser/`                                |
| Angular build only                         | `npm run build:angular`                                                  |
| Format                                     | `npx prettier --write <files>`                                           |
| Deploy Firestore rules                     | **see [§7 Firebase](#7-firebase)**: do not deploy from this repo blindly |

Node 24+ is expected by some dev tools; Node 22 works for build and test.

## 3. Folder map

```
src/
  app/
    app.routes.ts            language-prefixed, lazy-loaded routes (+ SEO keys in route data)
    app.routes.server.ts     prerender list = routes.manifest.json × tenant languages
    routes.manifest.json     ["", "about", "services", "contact", "not-found"]  ← add new pages here
    app.config.ts            browser providers (router, http, hydration, translate, error handler)
    app.config.server.ts     server/prerender providers (FsTranslateLoader reads JSON from disk)
    core/
      tenant/                TenantService (signals), tenant.model.ts, active-tenant.ts (build-time)
      i18n/                  I18nService (lang/dir signals, sets <html lang dir>), lang guard/resolver,
                             TenantTranslateLoader (browser), FsTranslateLoader (prerender), deepMerge
      seo/                   SeoService: title, meta, canonical, hreflang, OG, JSON-LD
      logging/               ErrorLogService → Firestore `errorLogs`, GlobalErrorHandler, HTTP interceptor
      firebase/              FirestoreGateway + FIREBASE_CONFIG token (lazy Firestore Lite writes)
      contact/               ContactService → Firestore `contacts`, CONTACT_LIMITS
    layout/shell/            header, responsive navbar, language switcher, skip link, footer, <main>
    features/<page>/         <page>.page.ts|html|less|spec.ts  (one folder per route)
      contact/               reactive form + contact.validators.ts
      chatbot/               n8n chat widget (used on Home)
  environments/environment.ts  version + public Firebase web config
  styles/                    _tokens.less (CSS variables), _base, _a11y, _forms, _breakpoints
  styles.less                global entry (imports the files above + shell styles)
  tenants/<id>/              theme.less (CSS-variable overrides), active-tenant.ts (build binding)
public/
  tenants/tenants.json       domain → tenant id
  tenants/<id>/              tenant.json, logo.svg, favicon.svg, og-image.svg, llms.txt, i18n/<lang>.json
scripts/                     check-i18n, check-tenants, check-contrast, generate-seo
deploy/                      Caddyfile (production), Caddyfile.test (local static test on :8080)
firestore.rules              rules for this site's collections (see §7)
.github/skills/              AI skills (see the Skills section)
```

**Rule:** anything a tenant can change (name, logo, colors, email, nav, texts, languages) lives in
`public/tenants/<id>/` or `src/tenants/<id>/`. Components never hard-code a brand name, email,
color, logo path or language list. Read them from `TenantService` and translations.

## 4. Conventions (must follow)

**Angular**

- Standalone components (don't write `standalone: true`), `inject()` instead of constructor params,
  signals for state, `@if/@for/@switch` control flow, `viewChild()`/`input()`/`output()` functions.
- Every route is lazy (`loadComponent`). Pages are named `XxxPage` in `features/xxx/xxx.page.ts`.
- Zoneless: don't rely on zone.js. After async work, update a signal; in tests `await fixture.whenStable()`.
- Browser-only APIs (`window`, `document.location`, `localStorage`, Firebase) must be guarded with
  `isPlatformBrowser`, because pages are prerendered in Node.
- Reactive forms: `NonNullableFormBuilder`, typed controls, `novalidate` on `<form>`, custom
  validators in `<feature>.validators.ts` with their own spec.
- Path aliases: `@public/*`, `@core/*`.

**Styles (Less + CSS variables)**

- Use tokens from `src/styles/_tokens.less` (`var(--color-primary)`, `var(--space-4)` …). No raw
  colors in components; add a token if needed (and check contrast on white).
- **Mobile-first:** base styles for phones, then `.from-sm/.from-md/.from-lg/.from-xl` mixins
  (`@import '_breakpoints';`). No `max-width` media queries for layout.
- **RTL-safe:** logical properties only (`margin-inline-start`, `padding-inline`, `inset-inline-end`,
  `text-align: start|end`). Never `left/right` for layout. Flip directional icons in RTL with
  `:host-context([dir='rtl']) & { transform: scaleX(-1); }`; use `var(--dir)` (1 / -1) for
  horizontal movement. Wrap emails/phones/numbers in `<bdi>` and give email/tel inputs `dir="ltr"`.
- Background stays white (`--color-bg`). Tenants override accents only, in `src/tenants/<id>/theme.less`.
- Component style budget is **4 kB** (warning). Reusable styles go to global partials
  (`_forms.less` for fields/errors/error summary, imported by `styles.less`).
- Targets ≥ 44px (`var(--target-min)`), visible focus ring (`var(--focus-ring)`).

**i18n**

- Every user-visible string is a key in **both** `public/tenants/<id>/i18n/en.json` and `he.json`
  (`npm run check:i18n` fails if keys differ). Namespace by page: `contact.form.email.label`.
- Template: `{{ 'key' | translate }}`, attributes: `[attr.aria-label]="'key' | translate"`.
- Links include the language: `[routerLink]="['/', i18n.lang(), 'contact']"`.
- Write Hebrew that sounds native, not word-for-word; use gender-neutral plural forms (שלחו, פנו).

**Accessibility (WCAG 2.2 AA)**

- One `<h1>` per page, logical headings, landmarks come from the shell.
- Form fields: visible `<label for>`, `autocomplete`, `required` attribute, errors as text linked with
  `aria-describedby` + `aria-invalid`, error summary focused on invalid submit, success heading focused.
- Decorative SVG: `aria-hidden="true" focusable="false"`. Icon-only buttons need an accessible name.
- Don't convey meaning by color alone (errors have an icon + text).

**SEO / AEO**

- Each route has `data.seo.titleKey/descriptionKey` (and `robots: 'noindex'` for not-found);
  SeoService does the rest. Add the SEO keys to the translations and to
  `requiredRouteKeys` in `scripts/check-i18n.mjs`.
- Answer-first copy, question-style FAQ headings, consistent facts in pages, JSON-LD and `llms.txt`.

**Errors and privacy**

- Unexpected errors go through `ErrorLogService.log(error, { source })`. Never log form values,
  emails, phones or query strings.

## 5. Recipes (common change requests)

### Change text / copy

Edit the key in `public/tenants/default/i18n/en.json` **and** `he.json` → `npm run check:i18n`.

### Change colors, radius, fonts (branding)

Global defaults: `src/styles/_tokens.less`. Tenant branding: `src/tenants/<id>/theme.less`
(variables only) → `npm run check:contrast`.

### Change logo, company name, email, menu items, languages

`public/tenants/<id>/tenant.json` (+ asset files in the same folder). New menu item → also add its
`labelKey` to both translation files. Keep `llms.txt` facts in sync.

### Add a new page (e.g. `/pricing`)

1. `src/app/features/pricing/pricing.page.ts|html|less|spec.ts` (copy the structure of `about`).
2. Route in `app.routes.ts` under `:lang` children, lazy `loadComponent`, with `data.seo` keys.
3. Add `"pricing"` to `src/app/routes.manifest.json` (prerender + sitemap).
4. Translations `pricing.*` incl. `pricing.seo.title/description` in en + he; add the SEO keys to
   `requiredRouteKeys` in `scripts/check-i18n.mjs`.
5. Optional nav item in `tenant.json` `nav` (+ `nav.pricing` translation).
6. Spec: renders one `<h1>`, key content, links. Run the definition of done (§8).

### Add a form that saves to Firestore

Follow the Contact page (`features/contact` + `core/contact`):

1. Service in `core/<name>/` that calls `FirestoreGateway.add('<collection>', data)`
   (adds `createdAt` server timestamp; rejects when not in the browser).
2. Export shared limits (lengths) and use the **same limits** in validators and in `firestore.rules`.
3. Page: typed reactive form, `.field` markup from `_forms.less`, statuses
   `idle | submitting | success | error`, focus management, ignore double submit.
4. Add a `match /<collection>/{id}` block (create-only, validated `keys().hasOnly/hasAll`, sizes,
   `createdAt == request.time`, `read, update, delete: if false`) to `firestore.rules`.
5. Specs: service (mock `FirestoreGateway`), validators, page (mock the service).
   The skill `smb-firestore-form` has the full checklist.

### Add a new tenant (company)

Folders `public/tenants/<id>/` + `src/tenants/<id>/`, `tenants.json` mapping, build + serve
configurations in `angular.json` (copy `default`, change `outputPath`, `fileReplacements`, assets,
styles), domain in `deploy/Caddyfile` → `npm run check`. See the skill, section "Adding a new tenant".

## 6. Testing

- Every component, service, validator, guard, resolver and interceptor ships with a `*.spec.ts`.
  Bug fixes start with a failing test.
- Tests use `TestBed` + `provideTranslateService()` (no translations loaded, so assert on **keys**,
  e.g. `'contact.form.email.errors.invalid'`), `provideRouter([])` for `routerLink`.
- Query by role, label or id, not by styling classes, where possible. Assert ARIA state
  (`aria-invalid`, `aria-expanded`, focus via `document.activeElement`).
- Never hit real Firebase or the network: mock `FirestoreGateway` / the feature service, or provide
  `{ provide: FIREBASE_CONFIG, useValue: { apiKey: '', projectId: '' } }`.
- `vi.mock()` of modules is not reliable with Angular's Vitest builder; inject dependencies through
  services/tokens so they can be replaced with `useValue`.

## 7. Firebase

- Firebase project **`sample-app-5fff2`**, **shared with the AgencyHub project**
  (`C:\Users\ytako\OneDrive\Desktop\AgencyHub`). The public web config is in
  `src/environments/environment.ts` (public by design; security comes from rules).
- Collections written by this site (client create-only, nobody can read from the browser):

  | Collection  | Written by        | Fields                                                                                     |
  | ----------- | ----------------- | ------------------------------------------------------------------------------------------ |
  | `contacts`  | `ContactService`  | tenantId, fullName, email, phone, message, lang, pageUrl, status (`new`), createdAt        |
  | `errorLogs` | `ErrorLogService` | tenantId, message, name, stack, source, url, lang, userAgent, appVersion, extra, createdAt |

- ⚠️ **One rules file per Firebase project.** `firebase deploy --only firestore:rules` from here would
  **replace AgencyHub's rules**. Copy the `contacts` / `errorLogs` blocks from this repo's
  `firestore.rules` into AgencyHub's rules file and deploy from there. Keep both files in sync.
- If you add/rename a field, update the service, the rules (`hasOnly`/`hasAll` + validation),
  the table above and the specs together.
- Recommended: enable App Check (reCAPTCHA) for the public contact form.

## 8. Definition of done (every change)

1. `npm test -- --watch=false` green (except known issues below)
2. `npm run check:i18n && npm run check:contrast` (and `check:tenants` when tenant/deploy files change)
3. `npm run build`: no errors and no new budget warnings
4. Look at the page at 390px and 1366px in **both `/en` and `/he`** (RTL mirrored, nothing overflows,
   keyboard focus visible and not hidden under the sticky header)
5. Formatted with Prettier; this file updated if a convention or command changed

## 9. Known issues / TODO

- `chatbot-widget.component.spec.ts` expects `https://n8n.34-71-188-154.sslip.io/...` but the
  component calls `https://smb.34-71-188-154.sslip.io/...`. Decide the correct URL and align both.
- `.github/workflows/deploy.yml` runs `npx ng build` and copies `dist/SMB-automation/browser`;
  `npm run build` outputs `dist/default/browser` and also generates sitemap/robots/llms.txt.
  Align the workflow with `npm run build` and the `dist/default/browser` path.
- `.example` site URL and email in `tenant.json`, `llms.txt`, `tenants.json` and `deploy/Caddyfile`
  are placeholders; replace before going public.
- `npm run check:tenants` needs `deploy/Caddyfile` to list the tenant domains.

## Skills

Project skills live in `.github/skills/` (Copilot loads them automatically; Claude Code and Codex
can open them on demand):

| Skill                          | Use it for                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `angular-multitenant-frontend` | Architecture reference: tenants, theming, i18n/RTL, SEO/AEO, a11y, testing, static hosting |
| `smb-add-page`                 | Step-by-step: add or change a page/route in this repo                                      |
| `smb-firestore-form`           | Step-by-step: add a form that saves to a Firestore collection                              |

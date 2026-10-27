---
name: smb-firestore-form
description: Add or change a form in the SMB Automation site that saves submissions to a Firestore collection (typed reactive form, validators, service via FirestoreGateway, security rules, a11y errors, tests).
---

# Form that saves to Firestore (SMB Automation)

Read `AGENTS.md` first. The Contact page is the reference implementation:
`src/app/features/contact/*`, `src/app/core/contact/contact.service.ts`,
`src/app/core/firebase/firestore-gateway.ts`, `src/styles/_forms.less`, `firestore.rules`.

## 1. Data contract first

- Choose the collection name (plural, camelCase) and the exact fields.
- Export limits from the service (`<NAME>_LIMITS`) and reuse them in validators, `maxlength`
  attributes and `firestore.rules`, so the three never disagree.
- Always store: `tenantId` (`TenantService.id()`), `lang` (`I18nService.lang()`), `pageUrl`
  (`document.location.pathname`), `status: 'new'`. `createdAt` is added by `FirestoreGateway`.

## 2. Service (`src/app/core/<name>/<name>.service.ts`)

- `providedIn: 'root'`; inject `FirestoreGateway`, `TenantService`, `I18nService`, `DOCUMENT`, `PLATFORM_ID`.
- Reject when not in the browser (pages are prerendered).
- Trim strings, lowercase emails, then `return this.firestore.add('<collection>', {...})`.
- Never log the submitted values.

## 3. Validators (`<feature>.validators.ts` + spec)

- Reuse `notBlank`, `minTrimmedLength`, `phoneNumber`, `EMAIL_PATTERN` from
  `features/contact/contact.validators.ts` (move them to `src/app/shared/validators/` if a
  second feature needs them).
- Error keys returned by the page: `<feature>.form.<field>.errors.required|invalid|minlength|maxlength`.

## 4. Page component

- `NonNullableFormBuilder` typed group; `status = signal<'idle'|'submitting'|'success'|'error'>`;
  `submitAttempted` signal; `errorKey(field)` shows an error when the control is invalid and
  (touched or submit attempted).
- On submit: ignore while submitting → `markAllAsTouched()` → if invalid, focus the error summary
  (`afterNextRender`) → else call service → success: reset form, show success panel, focus its
  heading → error: keep values, show `role="alert"` with the tenant email, `ErrorLogService.log(error, { source: 'manual' })`.
- Markup (styles come from global `_forms.less`):
  ```html
  <div class="field" [class.field--invalid]="errorKey('email')">
    <label for="x-email"
      >{{ '…label' | translate }}
      <span class="field__required" aria-hidden="true">*</span></label
    >
    <input
      id="x-email"
      type="email"
      dir="ltr"
      autocomplete="email"
      required
      formControlName="email"
      [attr.aria-invalid]="errorKey('email') ? 'true' : null"
      [attr.aria-describedby]="errorKey('email') ? 'x-email-error' : null"
    />
    @if (errorKey('email'); as key) {
    <p class="field__error" id="x-email-error">{{ key | translate }}</p>
    }
  </div>
  ```
- `<form novalidate>`; error-summary links call `focusField($event, field)` (plain `#id` links would
  navigate away in Angular); submit button uses `aria-disabled` + spinner, not `disabled`.
- Include a back-to-home link if the page is a destination (`[routerLink]="['/', i18n.lang()]"`).

## 5. Translations

All labels, hints, errors, summary title, submit/submitting, success and failure texts in **en + he**.

## 6. Firestore rules (`firestore.rules`)

```
match /<collection>/{id} {
  allow create: if request.resource.data.keys().hasOnly([...all fields...])
    && request.resource.data.keys().hasAll([...all fields...])
    && /* type + size checks per field, same limits as the service */
    && request.resource.data.status == 'new'
    && request.resource.data.createdAt == request.time;
  allow read, update, delete: if false;
}
```

⚠️ The Firebase project is shared with AgencyHub: copy the block into AgencyHub's rules and deploy
from there. Update the collections table in `AGENTS.md`.

## 7. Tests

- Service spec: mock `FirestoreGateway` (`{ add: vi.fn() }`); assert the exact payload, trimming,
  error propagation, and no write on the server platform.
- Validators spec: table-driven `it.each` for valid/invalid values.
- Page spec: mock the service and `ErrorLogService`; empty submit shows required errors with
  `aria-invalid` + linked messages and focuses the summary; invalid formats; valid submit calls the
  service and focuses the success heading; failure keeps values and shows the alert; double submit ignored.

## 8. Verify

`npm test -- --watch=false` · `npm run check:i18n` · `npm run build` · try `/en/...` and `/he/...`
at 390px and 1366px; with Firebase configured and rules deployed, submit once and confirm the
document in the Firebase console.

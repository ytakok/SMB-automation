# One-click account connections (n8n)

The `/integrations` page lets a customer connect Google or Microsoft 365 by **signing in and
approving access**. The customer never creates, copies or sends a key, and the agency never sees
a password. The OAuth app (client ID + secret) belongs to the agency and lives **only in n8n**.

```
Browser (/integrations)                n8n                                Google / Microsoft
──────────────────────                 ───                                ──────────────────
1. POST /webhook/connections/start ──► check invite code, build sign-in
   {provider, inviteCode, lang,        URL with the agency client ID and
    returnUrl}                         a one-time `state`
                                   ◄── 200 {authUrl}
2. location.assign(authUrl) ─────────────────────────────────────────────► customer signs in,
                                                                           approves access
3.                                     GET /webhook/connections/callback ◄─ ?code=…&state=…
                                       check `state`, exchange `code` for
                                       tokens (client secret stays here),
                                       create the n8n credential
4. ◄──────────────────────────────── 302 returnUrl?status=connected&provider=google
```

## Front-end pieces (this repo)

| File                                      | Role                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `core/n8n/n8n.config.ts`                  | `N8N_CONFIG` token from `tenant.json` → `automation.webhookBaseUrl`       |
| `core/n8n/n8n-webhook.client.ts`          | The one HTTP client for n8n webhooks: timeout, typed `N8nError` kinds     |
| `core/n8n/n8n-connections.service.ts`     | `start()` → sign-in URL (host allow-listed), `readResult()` of the return |
| `core/n8n/connection-providers.ts`        | Providers: sign-in hosts, revoke page, number of access lines             |
| `core/n8n/external-navigation.ts`         | Leaves the site (`location.assign`), replaceable in tests                 |
| `features/integrations/integrations.page` | The page; texts under `integrations.*` in en + he                         |

Send customers a link with their code filled in: `https://<site>/he/integrations?code=ACME-7F3K`.

## Webhook contract (n8n side)

### Test from localhost

Run the site with `npm start` and open `http://localhost:4200/en/integrations?code=<invite-code>`.
In Angular development mode on `localhost` (or `127.0.0.1`), webhook requests use the dev-server
proxy in `proxy.conf.json`, so the browser sends them to its own origin instead of making a
cross-origin request directly to n8n. The proxy target must point to the n8n host that serves the
production `/webhook/...` endpoints.

The start workflow must still recognize the invite code and allow the local return origin
`http://localhost:4200` (and, if needed, `http://127.0.0.1:4200`) in its strict `returnUrl`
allow-list. Do not remove the origin check or accept arbitrary return URLs. Google should continue
redirecting to the public n8n callback URL; after handling OAuth, n8n redirects the browser back to
the allowed localhost integrations URL. Remove the localhost origins from the workflow before
production use if local testing is no longer needed.

### `POST /webhook/connections/start`

Request body (JSON):

| Field        | Example                        | Notes                                                    |
| ------------ | ------------------------------ | -------------------------------------------------------- |
| `provider`   | `google` \| `microsoft`        | Reject anything else with 400                            |
| `inviteCode` | `ACME-7F3K`                    | 6–64 letters, digits, dashes. Unknown → **403**          |
| `lang`       | `he`                           | Language for messages                                    |
| `returnUrl`  | `https://smb…/he/integrations` | **Only accept the site's own origin** (no open redirect) |

Responses:

- `200 {"authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."}`. The site refuses any URL
  that isn't https on `accounts.google.com` / `login.microsoftonline.com`.
- `403` wrong or used invite code (the page says "check your code", no error log).
- `5xx` anything else (the page shows a generic message and logs to `errorLogs`).

Build the Google URL with `client_id`, `redirect_uri=<n8n>/webhook/connections/callback`,
`response_type=code`, `access_type=offline`, `prompt=consent`, the scopes you need, and a random
`state` you store (for example in an n8n Data Table) together with the invite code, provider and
`returnUrl`, valid for 10 minutes.

Recommended Google scopes, narrowest first (see Google verification below):
`gmail.send`/`gmail.readonly`, `calendar.events`, `drive.file`, `spreadsheets`.

### `GET /webhook/connections/callback`

1. Look up `state`; missing or older than 10 minutes → redirect with `status=error&reason=expired`.
2. `error=access_denied` from the provider → `status=error&reason=denied`.
3. Exchange `code` at `https://oauth2.googleapis.com/token` (client secret from an n8n credential).
4. Create the customer's credential through the n8n public API (`POST /api/v1/credentials`),
   named `<invite code> – Google`, and mark the invite code as used.
5. Redirect (302) to `returnUrl?status=connected&provider=google`.
   On any failure: `status=error&provider=google&reason=failed`.

Only `denied`, `expired` and `failed` are shown; other `reason` values are treated as `failed`.

## Before going live

- **Own domain + Google verification.** An unverified Google app shows a warning and is limited to
  100 users. Verification needs a homepage and privacy policy on your own domain (not sslip.io).
  `gmail.readonly` and full Drive access are _restricted_ scopes that need a yearly security
  assessment; prefer `drive.file` and only the Gmail scope you really need.
- **Workspace customers** can instead trust the app in their admin console, or grant a service
  account domain-wide delegation (no per-user sign-in, nothing expires).
- **CORS:** for direct cross-origin production calls, set the webhook node's _Allowed Origins_ to
  the site URL. Local Angular development uses the proxy above, so the browser request is
  same-origin.

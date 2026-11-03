/**
 * Apps a customer can connect on the /connect page.
 * Texts live in the translations under `connect.apps.<id>`; this file holds what is not
 * translated: direct links, which step shows which paste field, and the labels used on the
 * connection sheet (always English, because the agency reads it).
 *
 * Translation shape per app: name, summary, steps[i].text, steps[i].button (when the step has
 * a link), steps[i].note (when `note` is true), fields.<key>.
 */
export interface ConnectField {
  key: string;
  /** English label written on the connection sheet. */
  sheetLabel: string;
  secret?: boolean;
  optional?: boolean;
  /** Format example shown as the placeholder (not translated). */
  example?: string;
}

export interface ConnectStep {
  /** Direct link the customer opens for this step (opens in a new tab). */
  link?: string;
  /** Show the n8n OAuth redirect address with a copy button. */
  copyRedirect?: boolean;
  /** Show the translated `note` under the step. */
  note?: boolean;
  /** Paste fields shown right under this step. */
  fields?: ConnectField[];
}

export interface ConnectApp {
  id: string;
  minutes: number;
  /** n8n credential type(s) the values go into, written on the connection sheet. */
  n8nCredential: string;
  steps: ConnectStep[];
}

export const OAUTH_CALLBACK_PATH = '/rest/oauth2-credential/callback';

const GOOGLE_APIS = [
  'gmail.googleapis.com',
  'sheets.googleapis.com',
  'drive.googleapis.com',
  'calendar-json.googleapis.com',
].join(',');

export const CONNECT_APPS: readonly ConnectApp[] = [
  {
    id: 'whatsapp',
    minutes: 15,
    n8nCredential:
      'WhatsApp API (Access Token + Business Account ID); WhatsApp OAuth API (App ID + App Secret) for the WhatsApp Trigger',
    steps: [
      { link: 'https://developers.facebook.com/apps/creation/' },
      {
        link: 'https://developers.facebook.com/apps/',
        note: true,
        fields: [
          { key: 'phoneNumberId', sheetLabel: 'Phone number ID', example: '1234567890123456' },
          {
            key: 'businessAccountId',
            sheetLabel: 'WhatsApp Business Account ID',
            example: '1234567890123456',
          },
        ],
      },
      {
        link: 'https://business.facebook.com/settings/system-users',
        fields: [
          { key: 'accessToken', sheetLabel: 'Access token', secret: true, example: 'EAAG…' },
        ],
      },
      {
        link: 'https://developers.facebook.com/apps/',
        fields: [
          { key: 'appId', sheetLabel: 'App ID', example: '1234567890123456' },
          { key: 'appSecret', sheetLabel: 'App secret', secret: true },
        ],
      },
    ],
  },
  {
    id: 'google',
    minutes: 10,
    n8nCredential:
      'Google OAuth2 (one pair for Gmail, Google Sheets, Google Calendar and Google Drive)',
    steps: [
      { link: 'https://console.cloud.google.com/projectcreate' },
      { link: `https://console.cloud.google.com/flows/enableapi?apiid=${GOOGLE_APIS}` },
      { link: 'https://console.cloud.google.com/auth/overview', note: true },
      {
        link: 'https://console.cloud.google.com/auth/clients/create',
        copyRedirect: true,
        fields: [
          {
            key: 'clientId',
            sheetLabel: 'Client ID',
            example: '123-abc.apps.googleusercontent.com',
          },
          { key: 'clientSecret', sheetLabel: 'Client secret', secret: true, example: 'GOCSPX-…' },
        ],
      },
    ],
  },
  {
    id: 'microsoft',
    minutes: 10,
    n8nCredential: 'Microsoft OAuth2 (Outlook, Excel, OneDrive, Teams)',
    steps: [
      {
        link: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade',
        copyRedirect: true,
      },
      {
        fields: [
          { key: 'clientId', sheetLabel: 'Application (client) ID' },
          { key: 'tenantId', sheetLabel: 'Directory (tenant) ID' },
        ],
      },
      {
        note: true,
        fields: [{ key: 'clientSecret', sheetLabel: 'Client secret value', secret: true }],
      },
    ],
  },
  {
    id: 'hubspot',
    minutes: 5,
    n8nCredential: 'HubSpot App Token (private app access token)',
    steps: [
      { link: 'https://app.hubspot.com/l/private-apps' },
      {},
      {
        fields: [{ key: 'token', sheetLabel: 'Access token', secret: true, example: 'pat-eu1-…' }],
      },
    ],
  },
  {
    id: 'pipedrive',
    minutes: 2,
    n8nCredential: 'Pipedrive API (API Token)',
    steps: [
      {
        link: 'https://app.pipedrive.com/settings/api',
        fields: [{ key: 'token', sheetLabel: 'API token', secret: true }],
      },
    ],
  },
  {
    id: 'gemini',
    minutes: 2,
    n8nCredential: 'Google Gemini (PaLM) API (API Key)',
    steps: [
      {
        link: 'https://aistudio.google.com/apikey',
        fields: [{ key: 'apiKey', sheetLabel: 'API key', secret: true, example: 'AIza…' }],
      },
    ],
  },
];

export const DEFAULT_SELECTED_APPS: readonly string[] = ['whatsapp', 'google'];

export type ConnectValues = Record<string, Record<string, string>>;

export function requiredFields(app: ConnectApp): ConnectField[] {
  return app.steps.flatMap((step) => step.fields ?? []).filter((field) => !field.optional);
}

export function isAppReady(app: ConnectApp, values: ConnectValues): boolean {
  const appValues = values[app.id] ?? {};
  return requiredFields(app).every((field) => (appValues[field.key] ?? '').trim() !== '');
}

/** Plain-text sheet the customer sends to the agency (English on purpose). */
export function buildConnectionSheet(
  apps: readonly ConnectApp[],
  values: ConnectValues,
  companyName: string,
  redirectUri: string,
): string {
  const lines = [`Connection sheet for ${companyName}`, `n8n redirect URI: ${redirectUri}`, ''];
  for (const app of apps) {
    const appValues = values[app.id] ?? {};
    lines.push(`[${app.id}]${isAppReady(app, values) ? '' : ' (incomplete)'}`);
    lines.push(`n8n credential: ${app.n8nCredential}`);
    for (const field of app.steps.flatMap((step) => step.fields ?? [])) {
      lines.push(`  ${field.sheetLabel}: ${appValues[field.key]?.trim() || '-'}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

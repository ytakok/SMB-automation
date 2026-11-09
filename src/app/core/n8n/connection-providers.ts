/**
 * Accounts a customer can connect with one click on the /integrations page.
 * The customer signs in on the provider's own page and approves access; n8n receives the
 * tokens and stores them as an n8n credential. The customer never sees or sends a key.
 *
 * Texts live in the translations under `integrations.providers.<id>`
 * (name, summary, button, access[i], revoke).
 */
export interface ConnectionProvider {
  id: 'google' | 'microsoft';
  /** Number of `access` lines in the translations (what the automation may do). */
  accessCount: number;
  /**
   * Hosts n8n may send the browser to for sign-in. Anything else is refused, so a broken or
   * tampered webhook response can't redirect customers to a look-alike page.
   */
  authHosts: readonly string[];
  /** Page where the customer can remove our access at any time. */
  revokeUrl: string;
}

export const CONNECTION_PROVIDERS: readonly ConnectionProvider[] = [
  {
    id: 'google',
    accessCount: 4,
    authHosts: ['accounts.google.com'],
    revokeUrl: 'https://myaccount.google.com/connections',
  },
  {
    id: 'microsoft',
    accessCount: 3,
    authHosts: ['login.microsoftonline.com'],
    revokeUrl: 'https://myapps.microsoft.com',
  },
];

export type ConnectionProviderId = ConnectionProvider['id'];

export function findProvider(id: string | null): ConnectionProvider | undefined {
  return CONNECTION_PROVIDERS.find((provider) => provider.id === id);
}

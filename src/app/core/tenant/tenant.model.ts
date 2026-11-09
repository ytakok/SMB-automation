export interface TenantLanguage {
  code: string;
  dir: 'ltr' | 'rtl';
  label: string;
}

export interface TenantConfig {
  id: string;
  name: string;
  defaultLang: string;
  languages: TenantLanguage[];
  logo: {
    src: string;
    width: number;
    height: number;
  };
  siteUrl: string;
  seo: {
    ogImage: string;
    twitter?: string;
  };
  contact: {
    email: string;
  };
  /** Agency automation backend (n8n). */
  automation?: {
    /** n8n editor URL; the /connect page builds the OAuth redirect URI from it. */
    n8nBaseUrl: string;
    /**
     * Where the site calls n8n webhooks (`<webhookBaseUrl>/webhook/...`). Defaults to n8nBaseUrl.
     * Use the site's own domain when Caddy proxies `/webhook*` to n8n (no CORS).
     */
    webhookBaseUrl?: string;
  };
  social: string[];
  nav: Array<{
    path: string;
    labelKey: string;
  }>;
}

type TenantConfigInput = Omit<TenantConfig, 'languages'> & {
  languages: Array<Omit<TenantLanguage, 'dir'> & { dir: string }>;
};

export function parseTenantConfig(config: TenantConfigInput): TenantConfig {
  const languages: TenantLanguage[] = config.languages.map((language): TenantLanguage => {
    if (language.dir === 'ltr') {
      return { ...language, dir: 'ltr' };
    }
    if (language.dir === 'rtl') {
      return { ...language, dir: 'rtl' };
    }
    throw new Error(`Invalid text direction "${language.dir}" for ${language.code}.`);
  });
  return { ...config, languages };
}

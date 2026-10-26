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

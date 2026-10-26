import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { I18nService } from '../i18n/i18n.service';

interface SeoData {
  titleKey?: string;
  descriptionKey?: string;
  robots?: string;
}

@Injectable()
export class SeoService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tenant = inject(TenantService);
  private readonly i18n = inject(I18nService);
  private readonly translate = inject(TranslateService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.update());
  }

  private update(): void {
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const seo = (route.snapshot.data['seo'] ?? {}) as SeoData;
    const config = this.tenant.config();
    const pageTitle = seo.titleKey ? this.translate.instant(seo.titleKey) : config.name;
    const description = seo.descriptionKey ? this.translate.instant(seo.descriptionKey) : '';
    const fullTitle = `${pageTitle} | ${config.name}`;
    const pathname = this.router.url.split(/[?#]/, 1)[0].replace(/\/+$/, '');
    const canonical = new URL(pathname || `/${this.i18n.lang()}`, config.siteUrl).toString();

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: seo.robots ?? 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:site_name', content: config.name });
    this.meta.updateTag({
      property: 'og:image',
      content: new URL(config.seo.ogImage, config.siteUrl).toString(),
    });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({
      property: 'og:locale',
      content: this.i18n.lang() === 'en' ? 'en_US' : this.i18n.lang(),
    });
    this.meta.removeTag('property="og:locale:alternate"');
    for (const language of config.languages) {
      if (language.code !== this.i18n.lang()) {
        this.meta.updateTag({
          property: 'og:locale:alternate',
          content: language.code,
        });
      }
    }
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({
      name: 'twitter:image',
      content: new URL(config.seo.ogImage, config.siteUrl).toString(),
    });
    this.setLink('canonical', canonical);
    this.setAlternates();
    this.setStructuredData(config.name, canonical, pathname);
  }

  private setLink(rel: string, href: string, hreflang?: string): void {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let link = this.document.head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = this.document.createElement('link');
      link.rel = rel;
      if (hreflang) {
        link.hreflang = hreflang;
      }
      this.document.head.appendChild(link);
    }
    link.href = href;
  }

  private setAlternates(): void {
    const config = this.tenant.config();
    const path = this.router.url.split(/[?#]/, 1)[0].replace(/^\/[^/]+/, '');
    for (const language of config.languages) {
      this.setLink(
        'alternate',
        new URL(`/${language.code}${path}`, config.siteUrl).toString(),
        language.code,
      );
    }
    this.setLink(
      'alternate',
      new URL(`/${config.defaultLang}${path}`, config.siteUrl).toString(),
      'x-default',
    );
  }

  private setStructuredData(name: string, url: string, pathname: string): void {
    const tenant = this.tenant.config();
    const segments = pathname.split('/').filter(Boolean).slice(1);
    const data = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name,
          url: tenant.siteUrl,
          email: tenant.contact.email,
          logo: new URL(tenant.logo.src, tenant.siteUrl).toString(),
        },
        {
          '@type': 'WebSite',
          name,
          url: tenant.siteUrl,
          inLanguage: this.i18n.lang(),
        },
        ...(segments.length
          ? [
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: this.translate.instant('nav.home'),
                    item: new URL(`/${this.i18n.lang()}`, tenant.siteUrl).toString(),
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: this.translate.instant(`nav.${segments[0]}`),
                    item: url,
                  },
                ],
              },
            ]
          : []),
      ],
    };

    let script = this.document.getElementById('structured-data') as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = 'structured-data';
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }
}

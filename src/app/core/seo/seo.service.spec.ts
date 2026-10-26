import { DOCUMENT } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { TranslationObject } from '../i18n/deep-merge';
import { SeoService } from './seo.service';

@Component({ template: '' })
class SeoTestPage {}

class SeoTestLoader implements TranslateLoader {
  getTranslation(_lang: string): Observable<TranslationObject> {
    return of({
      nav: { home: 'Home' },
      home: { seo: { title: 'Business automation', description: 'Helpful automation.' } },
    });
  }
}

describe('SeoService', () => {
  it('writes page metadata and one structured-data script after navigation', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'en',
            component: SeoTestPage,
            data: {
              seo: {
                titleKey: 'home.seo.title',
                descriptionKey: 'home.seo.description',
              },
            },
          },
        ]),
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: SeoTestLoader },
          fallbackLang: 'en',
        }),
        SeoService,
      ],
    });
    const translate = TestBed.inject(TranslateService);
    await firstValueFrom(translate.use('en'));
    TestBed.inject(SeoService);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/en', SeoTestPage);

    const document = TestBed.inject(DOCUMENT);
    expect(TestBed.inject(Title).getTitle()).toBe('Business automation | SMB Automation');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Helpful automation.',
    );
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://smb-automation.example/en',
    );
    expect(document.querySelector('link[hreflang="x-default"]')).toBeTruthy();
    expect(document.querySelectorAll('#structured-data')).toHaveLength(1);
    expect(
      JSON.parse(document.querySelector('#structured-data')?.textContent ?? '{}')['@graph'][0][
        '@type'
      ],
    ).toBe('Organization');
  });
});

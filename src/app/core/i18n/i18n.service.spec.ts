import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  it('sets the document language and text direction for the active locale', async () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    const i18n = TestBed.inject(I18nService);
    const document = TestBed.inject(DOCUMENT);

    await firstValueFrom(i18n.use('en'));

    expect(i18n.lang()).toBe('en');
    expect(i18n.dir()).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('updates language and text direction when switching between configured locales', async () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    const i18n = TestBed.inject(I18nService);
    const document = TestBed.inject(DOCUMENT);

    await firstValueFrom(i18n.use('he'));
    expect(i18n.lang()).toBe('he');
    expect(i18n.dir()).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');

    await firstValueFrom(i18n.use('en'));
    expect(i18n.lang()).toBe('en');
    expect(i18n.dir()).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('rejects a locale not configured for the active tenant', () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    const i18n = TestBed.inject(I18nService);

    expect(() => i18n.use('fr')).toThrow('Unsupported language: fr');
  });
});

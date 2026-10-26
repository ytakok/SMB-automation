import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { TenantTranslateLoader } from './tenant-translate.loader';

describe('TenantTranslateLoader', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TenantTranslateLoader],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deep-merges shared and tenant translations, with tenant values taking precedence', async () => {
    const loader = TestBed.inject(TenantTranslateLoader);
    const translations = firstValueFrom(loader.getTranslation('en'));

    http.expectOne('/i18n/en.json').flush({ nav: { home: 'Home', about: 'About' } });
    http
      .expectOne('/tenants/default/i18n/en.json')
      .flush({ nav: { home: 'Start' }, brand: 'SMB Automation' });

    await expect(translations).resolves.toEqual({
      nav: { home: 'Start', about: 'About' },
      brand: 'SMB Automation',
    });
  });

  it('uses shared translations when tenant overrides cannot be loaded', async () => {
    const loader = TestBed.inject(TenantTranslateLoader);
    const translations = firstValueFrom(loader.getTranslation('en'));

    http.expectOne('/i18n/en.json').flush({ nav: { home: 'Home' } });
    http
      .expectOne('/tenants/default/i18n/en.json')
      .flush('missing', { status: 404, statusText: 'Not Found' });

    await expect(translations).resolves.toEqual({ nav: { home: 'Home' } });
  });
});

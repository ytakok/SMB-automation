import { TestBed } from '@angular/core/testing';
import { Route, UrlSegment } from '@angular/router';
import { TenantService } from '../tenant/tenant.service';
import { langGuard } from './lang.guard';

describe('langGuard', () => {
  it('matches only languages supported by the tenant', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TenantService,
          useValue: { languages: () => [{ code: 'en', dir: 'ltr', label: 'English' }] },
        },
      ],
    });

    const canMatch = (language: string) =>
      TestBed.runInInjectionContext(() => langGuard({} as Route, [new UrlSegment(language, {})]));

    expect(canMatch('en')).toBe(true);
    expect(canMatch('fr')).toBe(false);
  });
});

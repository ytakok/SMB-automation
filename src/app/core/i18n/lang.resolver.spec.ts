import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';
import { I18nService } from './i18n.service';
import { langResolver } from './lang.resolver';

describe('langResolver', () => {
  it('loads the language from the route parameter', async () => {
    const use = vi.fn(() => of('loaded'));
    TestBed.configureTestingModule({
      providers: [{ provide: I18nService, useValue: { use } }],
    });
    const route = {
      paramMap: convertToParamMap({ lang: 'en' }),
    } as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => langResolver(route, {} as never));

    expect(use).toHaveBeenCalledWith('en');
    if (!isObservable(result)) {
      throw new Error('Expected the language resolver to return an observable.');
    }
    await expect(firstValueFrom(result)).resolves.toBe('en');
  });
});

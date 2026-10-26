import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { deepMerge, TranslationObject } from './deep-merge';

@Injectable()
export class TenantTranslateLoader implements TranslateLoader {
  private readonly http = inject(HttpClient);
  private readonly tenant = inject(TenantService);

  getTranslation(lang: string): Observable<TranslationObject> {
    const shared = this.http
      .get<TranslationObject>(`/i18n/${lang}.json`)
      .pipe(catchError(() => of({})));
    const tenant = this.http
      .get<TranslationObject>(`/tenants/${this.tenant.id()}/i18n/${lang}.json`)
      .pipe(catchError(() => of({})));

    return forkJoin([shared, tenant]).pipe(
      map(([sharedTranslations, tenantTranslations]) =>
        deepMerge(sharedTranslations, tenantTranslations),
      ),
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Observable, of } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';
import { deepMerge, TranslationObject } from './deep-merge';

@Injectable()
export class FsTranslateLoader implements TranslateLoader {
  private readonly tenant = inject(TenantService);

  private read(relativePath: string): TranslationObject {
    try {
      return JSON.parse(
        readFileSync(join(process.cwd(), 'public', relativePath), 'utf8'),
      ) as TranslationObject;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  getTranslation(lang: string): Observable<TranslationObject> {
    const shared = this.read(`i18n/${lang}.json`);
    const own = this.read(`tenants/${this.tenant.id()}/i18n/${lang}.json`);
    return of(deepMerge(shared, own));
  }
}

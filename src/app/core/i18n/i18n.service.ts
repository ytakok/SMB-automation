import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { TenantService } from '../tenant/tenant.service';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly translate = inject(TranslateService);
  private readonly tenant = inject(TenantService);
  private readonly document = inject(DOCUMENT);

  readonly lang = signal(this.tenant.config().defaultLang);
  readonly dir = signal<'ltr' | 'rtl'>('ltr');

  initialLang(): string {
    const supported = this.tenant.languages().map((language) => language.code);
    const browserLang = typeof navigator === 'undefined' ? '' : navigator.language.slice(0, 2);
    return supported.includes(browserLang) ? browserLang : this.tenant.config().defaultLang;
  }

  use(code: string): Observable<unknown> {
    const language = this.tenant.language(code);
    if (!language) {
      throw new Error(`Unsupported language: ${code}`);
    }

    this.lang.set(code);
    this.dir.set(language.dir);
    this.document.documentElement.lang = code;
    this.document.documentElement.dir = language.dir;
    return this.translate.use(code);
  }
}

import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TenantTranslateLoader } from './core/i18n/tenant-translate.loader';
import { GlobalErrorHandler } from './core/logging/global-error-handler';
import { httpErrorInterceptor } from './core/logging/http-error.interceptor';
import { withInterceptors } from '@angular/common/http';
import { SeoService } from './core/seo/seo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withFetch(), withInterceptors([httpErrorInterceptor])),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    provideTranslateService({
      loader: { provide: TranslateLoader, useClass: TenantTranslateLoader },
      fallbackLang: 'en',
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    SeoService,
  ],
};

import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { I18nService } from './i18n.service';

export const langResolver: ResolveFn<string> = (route) => {
  const lang = route.paramMap.get('lang');
  if (!lang) {
    throw new Error('A language segment is required.');
  }
  return inject(I18nService)
    .use(lang)
    .pipe(map(() => lang));
};

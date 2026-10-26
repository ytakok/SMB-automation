import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorLogService } from './error-log.service';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const logger = inject(ErrorLogService);
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0 || error.status >= 500) {
        const path = new URL(request.url, 'https://local.invalid').pathname;
        void logger.log(new Error(`HTTP ${error.status} ${request.method} ${path}`), {
          source: 'http',
          extra: { status: error.status },
        });
      }
      return throwError(() => error);
    }),
  );
};

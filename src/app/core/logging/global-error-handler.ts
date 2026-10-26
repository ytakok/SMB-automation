import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ErrorLogService } from './error-log.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(ErrorLogService);

  handleError(error: unknown): void {
    console.error(error);
    void this.logger.log(error, { source: 'global' });
  }
}

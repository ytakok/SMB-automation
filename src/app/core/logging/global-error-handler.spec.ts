import { TestBed } from '@angular/core/testing';
import { ErrorLogService } from './error-log.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  it('logs the error and forwards it to the runtime logger', () => {
    const log = vi.fn().mockResolvedValue(undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, { provide: ErrorLogService, useValue: { log } }],
    });

    const error = new Error('unexpected');
    TestBed.inject(GlobalErrorHandler).handleError(error);

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(log).toHaveBeenCalledWith(error, { source: 'global' });
    consoleError.mockRestore();
  });
});

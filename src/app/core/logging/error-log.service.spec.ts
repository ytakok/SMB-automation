import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ErrorLogService } from './error-log.service';

describe('ErrorLogService', () => {
  it('surfaces missing Firebase configuration instead of reporting a successful write', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const logger = TestBed.inject(ErrorLogService);

    await expect(
      logger.log(new Error('expected failure'), { source: 'manual' }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Firebase error logging is not configured'),
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});

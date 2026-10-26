import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ErrorLogService } from './error-log.service';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let http: HttpTestingController;
  const log = vi.fn();

  beforeEach(() => {
    log.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: ErrorLogService, useValue: { log } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('logs server failures without swallowing the HTTP error', async () => {
    const response = firstValueFrom(TestBed.inject(HttpClient).get('/api/report')).catch(
      (error: HttpErrorResponse) => error,
    );
    http.expectOne('/api/report').flush({}, { status: 500, statusText: 'Internal Server Error' });

    const error = await response;

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(log).toHaveBeenCalledWith(expect.any(Error), {
      source: 'http',
      extra: { status: 500 },
    });
    expect(log.mock.calls[0][0].message).toBe('HTTP 500 GET /api/report');
  });
});

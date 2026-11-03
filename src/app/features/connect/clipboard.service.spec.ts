import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClipboardService } from './clipboard.service';

describe('ClipboardService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('copies with the browser clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const copied = await TestBed.inject(ClipboardService).copy('hello');

    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('resolves false when the browser refuses', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    expect(await TestBed.inject(ClipboardService).copy('hello')).toBe(false);
  });

  it('does nothing while prerendering', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

    expect(await TestBed.inject(ClipboardService).copy('hello')).toBe(false);
  });
});

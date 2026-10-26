import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { NotFoundPage } from './not-found.page';

describe('NotFoundPage', () => {
  it('provides a single heading and a route back to the language home', async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPage],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('a.button')).toBeTruthy();
  });
});

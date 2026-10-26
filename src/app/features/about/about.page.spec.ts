import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AboutPage } from './about.page';

describe('AboutPage', () => {
  it('renders one page heading and the three operating principles', async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(3);
  });
});

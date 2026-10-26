import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ServicesPage } from './services.page';

describe('ServicesPage', () => {
  it('renders all service descriptions and a contact action', async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesPage],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ServicesPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.service-card')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('a.button')).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ContactPage } from './contact.page';

describe('ContactPage', () => {
  it('shows the tenant contact address as an email action', async () => {
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ContactPage);
    fixture.detectChanges();

    const emailLink = fixture.nativeElement.querySelector(
      'a[href^="mailto:"]',
    ) as HTMLAnchorElement;
    expect(emailLink).toBeTruthy();
    expect(emailLink.getAttribute('href')).toBe('mailto:hello@smb-automation.example');
  });
});

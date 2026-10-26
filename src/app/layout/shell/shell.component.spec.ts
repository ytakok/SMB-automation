import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  it('shows only the language that is not currently active', async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    const languageLinks = fixture.nativeElement.querySelectorAll(
      '.language-switcher .language-link',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(languageLinks).toHaveLength(1);
    expect(languageLinks[0].textContent.trim()).toBe('עברית');
  });

  it('closes the mobile menu with Escape and restores focus to the toggle', async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), provideTranslateService()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });
});

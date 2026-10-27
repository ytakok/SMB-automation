import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ContactService } from '../../core/contact/contact.service';
import { ErrorLogService } from '../../core/logging/error-log.service';
import { ContactPage } from './contact.page';

describe('ContactPage', () => {
  let fixture: ComponentFixture<ContactPage>;
  let element: HTMLElement;
  let submitRequest: ReturnType<typeof vi.fn>;
  let logError: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    submitRequest = vi.fn().mockResolvedValue('doc-1');
    logError = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [ContactPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ContactService, useValue: { submit: submitRequest } },
        { provide: ErrorLogService, useValue: { log: logError } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactPage);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  const field = (id: string) =>
    element.querySelector(`#contact-${id}`) as HTMLInputElement | HTMLTextAreaElement;

  function type(id: string, value: string): void {
    const input = field(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  async function submitForm(): Promise<void> {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  function fillValidForm(): void {
    type('fullName', '  Dana Levi ');
    type('email', 'dana@example.com');
    type('phone', '050-123-4567');
    type('message', 'Automate invoices');
  }

  it('has a back-to-home link for the current language', () => {
    const home = element.querySelector('.back-link') as HTMLAnchorElement;
    expect(home.getAttribute('href')).toBe('/en');
    expect(home.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('labels every field and marks the three required ones', () => {
    for (const id of ['fullName', 'email', 'phone', 'message']) {
      expect(element.querySelector(`label[for="contact-${id}"]`)).toBeTruthy();
    }
    expect(field('fullName').required).toBe(true);
    expect(field('email').required).toBe(true);
    expect(field('phone').required).toBe(true);
    expect(field('message').required).toBe(false);
    expect(field('email').getAttribute('autocomplete')).toBe('email');
    expect(field('phone').getAttribute('autocomplete')).toBe('tel');
  });

  it('shows linked required errors and focuses the error summary on an empty submit', async () => {
    await submitForm();

    expect(submitRequest).not.toHaveBeenCalled();
    for (const id of ['fullName', 'email', 'phone']) {
      const input = field(id);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const errorId = input.getAttribute('aria-describedby')!.split(' ').pop()!;
      expect(element.querySelector(`#${errorId}`)?.textContent).toContain(
        `contact.form.${id}.errors.required`,
      );
    }
    expect(field('message').getAttribute('aria-invalid')).toBeNull();

    const summary = element.querySelector('.error-summary') as HTMLElement;
    expect(summary.querySelectorAll('li')).toHaveLength(3);
    expect(document.activeElement).toBe(summary);
  });

  it('error-summary links move focus to the field', async () => {
    await submitForm();
    (element.querySelector('.error-summary a') as HTMLAnchorElement).click();
    expect(document.activeElement).toBe(field('fullName'));
  });

  it('shows invalid-format errors for email and phone after the user leaves the field', async () => {
    type('email', 'dana@example');
    type('phone', '123');
    await fixture.whenStable();

    expect(element.querySelector('#contact-email-error')?.textContent).toContain(
      'contact.form.email.errors.invalid',
    );
    expect(element.querySelector('#contact-phone-error')?.textContent).toContain(
      'contact.form.phone.errors.invalid',
    );
    expect(element.querySelector('#contact-fullName-error')).toBeNull();
  });

  it('submits valid data through the service and shows the success message', async () => {
    fillValidForm();
    await submitForm();
    await fixture.whenStable();

    expect(submitRequest).toHaveBeenCalledWith({
      fullName: '  Dana Levi ',
      email: 'dana@example.com',
      phone: '050-123-4567',
      message: 'Automate invoices',
    });
    expect(element.querySelector('form')).toBeNull();
    const heading = element.querySelector('.result--success h2') as HTMLElement;
    expect(heading.textContent).toContain('contact.form.success.title');
    expect(element.textContent).toContain('contact.form.success.text');
    expect(document.activeElement).toBe(heading);
    expect(element.querySelector('.result--success a.button')?.getAttribute('href')).toBe('/en');
  });

  it('starts a new, empty request from the success message', async () => {
    fillValidForm();
    await submitForm();
    await fixture.whenStable();

    (element.querySelector('.button--ghost') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(field('fullName').value).toBe('');
    expect(element.querySelector('.error-summary')).toBeNull();
  });

  it('keeps the data, shows an alert and logs the failure when sending fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    submitRequest.mockRejectedValueOnce(new Error('offline'));
    fillValidForm();
    await submitForm();
    await fixture.whenStable();

    const alert = element.querySelector('.form-alert') as HTMLElement;
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.querySelector('a')?.getAttribute('href')).toBe(
      'mailto:hello@smb-automation.example',
    );
    expect(field('email').value).toBe('dana@example.com');
    expect(logError).toHaveBeenCalledWith(expect.any(Error), { source: 'manual' });
  });

  it('ignores a second submit while a request is in flight', async () => {
    let finish!: (id: string) => void;
    submitRequest.mockReturnValueOnce(new Promise<string>((resolve) => (finish = resolve)));
    fillValidForm();
    await submitForm();
    await submitForm();

    expect(submitRequest).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.button--submit')?.getAttribute('aria-disabled')).toBe('true');
    finish('doc-1');
    await fixture.whenStable();
  });

  it('still offers the tenant email address as an alternative', () => {
    const emailLink = element.querySelector('.contact-card a[href^="mailto:"]');
    expect(emailLink?.getAttribute('href')).toBe('mailto:hello@smb-automation.example');
  });
});

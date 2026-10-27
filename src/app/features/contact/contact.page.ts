import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CONTACT_LIMITS, ContactService } from '../../core/contact/contact.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ErrorLogService } from '../../core/logging/error-log.service';
import { TenantService } from '../../core/tenant/tenant.service';
import { EMAIL_PATTERN, minTrimmedLength, notBlank, phoneNumber } from './contact.validators';

type ContactField = 'fullName' | 'email' | 'phone' | 'message';
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

const FIELD_ORDER: readonly ContactField[] = ['fullName', 'email', 'phone', 'message'];

@Component({
  selector: 'app-contact-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.less',
})
export class ContactPage {
  protected readonly tenant = inject(TenantService);
  protected readonly i18n = inject(I18nService);
  private readonly contact = inject(ContactService);
  private readonly logger = inject(ErrorLogService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  protected readonly limits = CONTACT_LIMITS;
  protected readonly status = signal<SubmitStatus>('idle');
  /** True after the first submit attempt, so all errors become visible. */
  protected readonly submitAttempted = signal(false);

  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary');
  private readonly successHeading = viewChild<ElementRef<HTMLElement>>('successHeading');

  protected readonly form = inject(NonNullableFormBuilder).group({
    fullName: [
      '',
      [
        Validators.required,
        notBlank,
        minTrimmedLength(CONTACT_LIMITS.fullNameMin),
        Validators.maxLength(CONTACT_LIMITS.fullNameMax),
      ],
    ],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(EMAIL_PATTERN),
        Validators.maxLength(CONTACT_LIMITS.emailMax),
      ],
    ],
    phone: ['', [Validators.required, notBlank, phoneNumber]],
    message: ['', [Validators.maxLength(CONTACT_LIMITS.messageMax)]],
  });

  /** Translation key of the error to show for a field, or null when it should not show one. */
  protected errorKey(field: ContactField): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !(control.touched || this.submitAttempted())) {
      return null;
    }
    const base = `contact.form.${field}.errors`;
    if (control.hasError('required')) return `${base}.required`;
    if (control.hasError('minlength')) return `${base}.minlength`;
    if (control.hasError('maxlength')) return `${base}.maxlength`;
    return `${base}.invalid`;
  }

  /** Fields with a visible error, in form order, for the error summary. */
  protected invalidFields(): ContactField[] {
    return FIELD_ORDER.filter((field) => this.errorKey(field) !== null);
  }

  protected async submit(): Promise<void> {
    if (this.status() === 'submitting') {
      return;
    }
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.status.set('idle');
      this.focusAfterRender(this.errorSummary);
      return;
    }

    this.status.set('submitting');
    try {
      await this.contact.submit(this.form.getRawValue());
      this.form.reset();
      this.submitAttempted.set(false);
      this.status.set('success');
      this.focusAfterRender(this.successHeading);
    } catch (error) {
      this.status.set('error');
      // Never log the form values (personal data); only the failure itself.
      void this.logger.log(error, { source: 'manual' });
    }
  }

  /** Error-summary links move focus to the field instead of changing the URL hash. */
  protected focusField(event: Event, field: ContactField): void {
    event.preventDefault();
    this.document.getElementById(`contact-${field}`)?.focus();
  }

  protected startOver(): void {
    this.status.set('idle');
  }

  /** Moves focus once the element exists, so screen readers announce the result. */
  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => target()?.nativeElement.focus(), { injector: this.injector });
  }
}

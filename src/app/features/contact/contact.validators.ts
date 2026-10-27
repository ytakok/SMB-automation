import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CONTACT_LIMITS } from '../../core/contact/contact.service';

/** Same rule as firestore.rules: something@domain.tld, no spaces. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Fails for values that are only whitespace (Validators.required accepts them). */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0
    ? { required: true }
    : null;
};

/**
 * Accepts local and international numbers such as "050-123-4567" or "+972 3 123 4567":
 * an optional leading "+", then digits, spaces, dashes, dots and parentheses,
 * with 7–15 digits in total.
 */
export const phoneNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, '').length;
  const valid =
    /^\+?[\d \-().]+$/.test(value) &&
    value.length <= CONTACT_LIMITS.phoneMax &&
    digits >= CONTACT_LIMITS.phoneDigitsMin &&
    digits <= CONTACT_LIMITS.phoneDigitsMax;
  return valid ? null : { phone: true };
};

/** Like Validators.minLength, but ignores surrounding spaces (the service trims before saving). */
export function minTrimmedLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    return value.length > 0 && value.length < min
      ? { minlength: { requiredLength: min, actualLength: value.length } }
      : null;
  };
}

import { FormControl } from '@angular/forms';
import { EMAIL_PATTERN, minTrimmedLength, notBlank, phoneNumber } from './contact.validators';

describe('contact validators', () => {
  it.each(['050-123-4567', '+972 3 123 4567', '(03) 1234567', '0501234567'])(
    'accepts phone number %s',
    (value) => expect(phoneNumber(new FormControl(value))).toBeNull(),
  );

  it.each(['12345', 'phone', '050-123-abcd', '+1 234 567 890 123 456 7', '++972501234567'])(
    'rejects phone number %s',
    (value) => expect(phoneNumber(new FormControl(value))).toEqual({ phone: true }),
  );

  it('leaves empty phone numbers to the required validator', () => {
    expect(phoneNumber(new FormControl(''))).toBeNull();
  });

  it('treats whitespace-only values as missing', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ required: true });
    expect(notBlank(new FormControl(' Dana '))).toBeNull();
  });

  it('measures minimum length without surrounding spaces', () => {
    expect(minTrimmedLength(2)(new FormControl(' a '))).toEqual({
      minlength: { requiredLength: 2, actualLength: 1 },
    });
    expect(minTrimmedLength(2)(new FormControl(' ab '))).toBeNull();
  });

  it('rejects tabs and line breaks inside phone numbers', () => {
    expect(phoneNumber(new FormControl('050\t1234567'))).toEqual({ phone: true });
  });

  it.each([
    ['dana@example.com', true],
    ['dana@example', false],
    ['dana example@x.com', false],
  ])('email %s valid=%s', (value, valid) => expect(EMAIL_PATTERN.test(value)).toBe(valid));
});

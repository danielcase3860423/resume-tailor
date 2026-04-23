import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizePhoneNumber(value, defaultCountry = 'US') {
  const rawValue = (value || '').toString().trim();

  if (!rawValue) {
    return '';
  }

  try {
    const parsed = parsePhoneNumberFromString(rawValue, defaultCountry);

    if (parsed?.number) {
      return parsed.number;
    }
  } catch (_) {
    // Fall through to digit-based normalization.
  }

  const digits = rawValue.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return rawValue;
}

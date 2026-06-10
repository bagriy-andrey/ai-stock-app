import { parsePhoneNumberFromString } from "libphonenumber-js";

const phoneIdentifierPattern = /^\+?[\d\s().-]+$/;

export function normalizePhoneNumber(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const phoneNumber = parsePhoneNumberFromString(trimmed);

  if (!phoneNumber?.isPossible()) {
    return null;
  }

  return phoneNumber.number;
}

export function isPhoneNumberLikeIdentifier(value: string): boolean {
  const trimmed = value.trim();

  return phoneIdentifierPattern.test(trimmed) && /\d/.test(trimmed);
}

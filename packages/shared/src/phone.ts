import { parsePhoneNumberFromString } from "libphonenumber-js";

const phoneIdentifierPattern = /^\+?[\d\s().-]+$/;
const trailingExtensionPattern =
  /(?:\s*(?:ext\.?|extension|x)\s*\d+)\s*$/i;

function preprocessPhoneNumber(value: string): string {
  const withoutTrailingExtension = value
    .trim()
    .replace(trailingExtensionPattern, "");

  if (withoutTrailingExtension.startsWith("00")) {
    return `+${withoutTrailingExtension.slice(2)}`;
  }

  return withoutTrailingExtension;
}

export function normalizePhoneNumber(value: string): string | null {
  const trimmed = preprocessPhoneNumber(value);

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
  const trimmed = preprocessPhoneNumber(value);

  return phoneIdentifierPattern.test(trimmed) && /\d/.test(trimmed);
}

import { normalizePhoneNumber } from "@ai-stock-advisor/shared";

export function validateOptionalProfilePhoneNumber(
  phoneNumber: string,
  errorMessage = "Enter a valid phone number with country code.",
): string | undefined {
  if (!phoneNumber.trim()) {
    return undefined;
  }

  return normalizePhoneNumber(phoneNumber)
    ? undefined
    : errorMessage;
}

export function normalizeOptionalProfilePhoneNumber(
  phoneNumber: string,
): string | null {
  const trimmed = phoneNumber.trim();

  if (!trimmed) {
    return null;
  }

  return normalizePhoneNumber(trimmed) ?? trimmed;
}

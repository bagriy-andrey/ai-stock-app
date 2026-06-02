import type { ProfileLanguage } from "@ai-stock-advisor/shared";

export const profileLanguages: readonly ProfileLanguage[] = ["en", "ru", "uk"];

export function normalizeProfileLanguage(value: unknown): ProfileLanguage {
  return profileLanguages.includes(value as ProfileLanguage)
    ? value as ProfileLanguage
    : "en";
}

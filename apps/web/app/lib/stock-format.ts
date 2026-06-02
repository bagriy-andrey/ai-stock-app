import type { ProfileLanguage } from "@ai-stock-advisor/shared";

export type ChangeVariant = "positive" | "negative" | "neutral";

export function formatCurrency(
  value: number,
  currency = "USD",
  language: ProfileLanguage,
  showSign = false,
): string {
  try {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: showSign ? "exceptZero" : "auto",
    }).format(value);
  } catch {
    const sign = showSign && value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)} ${currency}`;
  }
}

export function formatPercent(
  value: number,
  language: ProfileLanguage,
): string {
  return new Intl.NumberFormat(language, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value / 100);
}

export function getChangeVariant(value: number): ChangeVariant {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "negative";
  }

  return "neutral";
}

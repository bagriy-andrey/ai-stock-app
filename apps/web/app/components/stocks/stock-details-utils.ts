import type { ProfileLanguage, StockCandleRange } from "@ai-stock-advisor/shared";
import { formatCurrency } from "../../lib/stock-format";

export function formatPrice(
  price: number,
  currency: string | undefined,
  language: ProfileLanguage,
  withSign = false,
): string {
  return currency
    ? formatCurrency(price, currency, language, withSign)
    : new Intl.NumberFormat(language, {
        maximumFractionDigits: 2,
        signDisplay: withSign ? "always" : "auto",
      }).format(price);
}

export function formatMarketCap(
  value: number | undefined,
  currency: string | undefined,
  language: ProfileLanguage,
): string {
  if (!isFiniteNumber(value)) {
    return "N/A";
  }

  try {
    return new Intl.NumberFormat(language, {
      style: currency ? "currency" : "decimal",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(language, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
}

export function formatOptionalPrice(
  value: number | undefined,
  currency: string | undefined,
  language: ProfileLanguage,
): string {
  return isFiniteNumber(value) ? formatPrice(value, currency, language) : "N/A";
}

export function formatOptionalNumber(
  value: number | undefined,
  language: ProfileLanguage,
): string {
  return isFiniteNumber(value)
    ? new Intl.NumberFormat(language, {
        maximumFractionDigits: 2,
      }).format(value)
    : "N/A";
}

export function formatOptionalInteger(
  value: number | undefined,
  language: ProfileLanguage,
): string {
  return isFiniteNumber(value)
    ? new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
      }).format(value)
    : "N/A";
}

export function formatOptionalText(value: string | undefined): string {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : "N/A";
}

export function formatCandleDate(
  timestamp: string,
  language: ProfileLanguage,
  range: StockCandleRange,
): string {
  return new Intl.DateTimeFormat(
    language,
    range === "1d"
      ? { hour: "2-digit", minute: "2-digit" }
      : {
          day: "numeric",
          month: "short",
          year: range === "1y" || range === "5y" || range === "all"
            ? "numeric"
            : undefined,
        },
  ).format(new Date(timestamp));
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

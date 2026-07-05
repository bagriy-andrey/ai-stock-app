import type { ProfileLanguage } from "@ai-stock-advisor/shared";
import { formatCurrency, formatPercent } from "./stock-format";

interface WatchlistTargetPriceSummaryInput {
  currentPrice?: number;
  currency?: string;
  language: ProfileLanguage;
  targetPrice?: number;
}

export interface WatchlistTargetPriceSummary {
  deltaLabel: string | null;
  targetLabel: string | null;
  variant: "negative" | "neutral" | "positive";
}

export function getWatchlistTargetPriceSummary({
  currentPrice,
  currency = "USD",
  language,
  targetPrice,
}: WatchlistTargetPriceSummaryInput): WatchlistTargetPriceSummary {
  if (targetPrice === undefined) {
    return {
      deltaLabel: null,
      targetLabel: null,
      variant: "neutral",
    };
  }

  const targetLabel = formatCurrency(targetPrice, currency, language);

  if (
    currentPrice === undefined ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0
  ) {
    return {
      deltaLabel: null,
      targetLabel,
      variant: "neutral",
    };
  }

  const deltaPercent = ((targetPrice - currentPrice) / currentPrice) * 100;
  const variant =
    deltaPercent > 0 ? "positive" : deltaPercent < 0 ? "negative" : "neutral";

  return {
    deltaLabel: formatPercent(deltaPercent, language),
    targetLabel,
    variant,
  };
}

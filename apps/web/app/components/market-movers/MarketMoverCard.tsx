"use client";

import type {
  CompanyProfile,
  MarketMover,
  ProfileLanguage,
} from "@ai-stock-advisor/shared";
import { CompanyLogo } from "../stocks/CompanyLogo";

interface MarketMoverCardProps {
  language: ProfileLanguage;
  mover: MarketMover;
  onOpen: (stock: {
    companyName?: string;
    logoUrl?: string;
    ticker: string;
  }) => void;
  profile?: CompanyProfile;
  variant: "gainers" | "losers";
}

export function MarketMoverCard({
  language,
  mover,
  onOpen,
  profile,
  variant,
}: MarketMoverCardProps) {
  const ticker = mover.symbol.trim().toUpperCase();
  const companyName = mover.name || profile?.name || ticker;
  const directionLabel = variant === "gainers" ? "up" : "down";
  const formattedPercent = formatMoverPercent(
    mover.changesPercentage,
    language,
    variant,
  );

  return (
    <button
      aria-label={`Open details for ${ticker}, ${directionLabel} ${formatAbsolutePercent(
        mover.changesPercentage,
        language,
      )}`}
      className={`market-mover-card market-mover-card-${variant}`}
      onClick={() =>
        onOpen({
          ticker,
          companyName,
          logoUrl: profile?.logo,
        })
      }
      title={companyName}
      type="button"
    >
      <CompanyLogo
        className="market-mover-logo"
        companyName={companyName}
        logoUrl={profile?.logo}
        ticker={ticker}
      />
      <span className="market-mover-card-ticker">{ticker}</span>
      <span className="market-mover-card-percent">
        <span aria-hidden="true">{variant === "gainers" ? "▲" : "▼"}</span>
        {formattedPercent}
      </span>
    </button>
  );
}

function formatAbsolutePercent(
  value: number,
  language: ProfileLanguage,
): string {
  return new Intl.NumberFormat(language, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value) / 100);
}

function formatMoverPercent(
  value: number,
  language: ProfileLanguage,
  variant: "gainers" | "losers",
): string {
  const sign = variant === "gainers" ? "+" : "-";

  return `${sign}${formatAbsolutePercent(value, language)}`;
}

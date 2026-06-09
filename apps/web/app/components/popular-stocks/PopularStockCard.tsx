"use client";

import type { CompanyProfile } from "@ai-stock-advisor/shared";
import { CompanyLogo } from "../stocks/CompanyLogo";

interface PopularStockCardProps {
  companyUnavailableLabel: string;
  isLoading: boolean;
  onOpen: (stock: {
    companyName?: string;
    logoUrl?: string;
    ticker: string;
  }) => void;
  profile?: CompanyProfile;
  ticker: string;
}

export function PopularStockCard({
  companyUnavailableLabel,
  isLoading,
  onOpen,
  profile,
  ticker,
}: PopularStockCardProps) {
  const companyName = profile?.name ?? companyUnavailableLabel;
  const accessibleName = profile?.name ?? ticker;

  return (
    <button
      aria-label={`Open details for ${accessibleName}`}
      className="popular-stock-card"
      onClick={() =>
        onOpen({
          ticker,
          companyName: profile?.name,
          logoUrl: profile?.logo,
        })
      }
      type="button"
    >
      <CompanyLogo
        className="popular-stock-logo"
        companyName={companyName}
        logoUrl={profile?.logo}
        ticker={ticker}
      />
      <span className="popular-stock-identity">
        <strong>{ticker}</strong>
        {isLoading ? (
          <span
            aria-label={`Loading company profile for ${ticker}`}
            className="popular-stock-name-skeleton"
            role="status"
          />
        ) : (
          <span>{companyName}</span>
        )}
      </span>
    </button>
  );
}

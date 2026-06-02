"use client";

import type {
  CompanyProfile,
  ProfileLanguage,
  StockQuote,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import { useEffect, useState } from "react";
import type { Dictionary } from "../../dictionaries";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../../lib/stock-format";

interface StockCardProps {
  item: WatchlistItemDto;
  quote?: StockQuote;
  profile?: CompanyProfile;
  isPriceLoading: boolean;
  isRemoving: boolean;
  language: ProfileLanguage;
  t: Dictionary;
  onOpen: () => void;
  onRemove: () => void;
}

export function StockCard({
  item,
  quote,
  profile,
  isPriceLoading,
  isRemoving,
  language,
  t,
  onOpen,
  onRemove,
}: StockCardProps) {
  const companyName =
    profile?.name ?? item.companyName ?? t.companyNameNotSet;

  return (
    <article className="stock-card">
      <button
        aria-label={`${item.ticker}: ${companyName}`}
        className="stock-card-open"
        onClick={onOpen}
        type="button"
      >
        <div className="stock-card-header">
          <CompanyLogo
            companyName={companyName}
            logoUrl={profile?.logo}
            ticker={item.ticker}
          />
          <div className="stock-card-identity">
            <strong>{item.ticker}</strong>
            <p>{companyName}</p>
          </div>
        </div>
        <StockCardPrice
          currency={profile?.currency || quote?.currency || "USD"}
          isLoading={isPriceLoading}
          language={language}
          quote={quote}
          t={t}
        />
      </button>
      <button
        aria-label={`${isRemoving ? t.removing : t.remove} ${item.ticker}`}
        className="stock-card-remove"
        disabled={isRemoving}
        onClick={onRemove}
        type="button"
      >
        <TrashIcon />
      </button>
    </article>
  );
}

interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string;
  ticker: string;
}

export function CompanyLogo({
  companyName,
  logoUrl,
  ticker,
}: CompanyLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [logoUrl]);

  return (
    <div className="company-logo" aria-hidden="true">
      {logoUrl && !hasImageError ? (
        // Finnhub returns dynamic third-party image URLs, so a native image is intentional.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          onError={() => setHasImageError(true)}
          referrerPolicy="no-referrer"
          src={logoUrl}
        />
      ) : (
        <span>{getInitials(companyName, ticker)}</span>
      )}
    </div>
  );
}

interface StockCardPriceProps {
  currency?: string;
  isLoading: boolean;
  language: ProfileLanguage;
  quote?: StockQuote;
  t: Dictionary;
}

function StockCardPrice({
  currency = "USD",
  isLoading,
  language,
  quote,
  t,
}: StockCardPriceProps) {
  if (isLoading) {
    return <p className="stock-card-status">{t.loadingPrice}</p>;
  }

  if (!quote) {
    return <p className="stock-card-status">{t.priceUnavailable}</p>;
  }

  const variant = getChangeVariant(quote.change);

  return (
    <div className="stock-card-price">
      <strong>
        {formatCurrency(quote.currentPrice, currency, language)}
      </strong>
      <span className={`stock-change stock-change-${variant}`}>
        {formatCurrency(quote.change, currency, language, true)}
        <small>{formatPercent(quote.changePercent, language)}</small>
      </span>
    </div>
  );
}

function getInitials(companyName: string, ticker: string): string {
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (initials || ticker.slice(0, 2)).toUpperCase();
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

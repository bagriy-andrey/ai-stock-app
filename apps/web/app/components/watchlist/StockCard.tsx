"use client";

import type {
  CompanyProfile,
  ProfileLanguage,
  StockQuote,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import type { Dictionary } from "../../dictionaries";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../../lib/stock-format";
import { CompanyLogo } from "../stocks/CompanyLogo";

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

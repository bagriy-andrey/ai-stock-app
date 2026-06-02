"use client";

import type {
  CompanyProfile,
  ProfileLanguage,
  StockQuote,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import { useEffect, useId } from "react";
import type { Dictionary } from "../../dictionaries";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../../lib/stock-format";
import { CompanyLogo } from "./StockCard";

interface StockDetailsModalProps {
  item: WatchlistItemDto;
  isPriceLoading: boolean;
  language: ProfileLanguage;
  profile?: CompanyProfile;
  quote?: StockQuote;
  t: Dictionary;
  onClose: () => void;
}

export function StockDetailsModal({
  item,
  isPriceLoading,
  language,
  profile,
  quote,
  t,
  onClose,
}: StockDetailsModalProps) {
  const headingId = useId();
  const companyName =
    profile?.name ?? item.companyName ?? t.companyNameNotSet;
  const currency = profile?.currency || quote?.currency || "USD";

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="stock-modal-backdrop"
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal"
        role="dialog"
      >
        <button
          aria-label={t.close}
          className="stock-modal-close"
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>
        <div className="stock-modal-header">
          <CompanyLogo
            companyName={companyName}
            logoUrl={profile?.logo}
            ticker={item.ticker}
          />
          <div>
            <p className="stock-modal-ticker">
              {t.stockDetails} / {item.ticker}
            </p>
            <h2 id={headingId}>{companyName}</h2>
            <p className="stock-modal-metadata">
              {[profile?.exchange, profile?.industry]
                .filter(Boolean)
                .join(" / ")}
            </p>
          </div>
        </div>
        {isPriceLoading ? (
          <p>{t.loadingPrice}</p>
        ) : quote ? (
          <>
            <div className="stock-modal-price">
              <span>{t.currentPrice}</span>
              <strong>
                {formatCurrency(quote.currentPrice, currency, language)}
              </strong>
              <ChangeValue
                currency={currency}
                language={language}
                quote={quote}
              />
            </div>
            <dl className="stock-detail-grid">
              <StockDetail
                label={t.previousClose}
                value={formatCurrency(quote.previousClose, currency, language)}
              />
              <StockDetail
                label={t.openPrice}
                value={formatCurrency(quote.openPrice, currency, language)}
              />
              <StockDetail
                label={t.dayHigh}
                value={formatCurrency(quote.highPrice, currency, language)}
              />
              <StockDetail
                label={t.dayLow}
                value={formatCurrency(quote.lowPrice, currency, language)}
              />
            </dl>
          </>
        ) : (
          <p>{t.priceUnavailable}</p>
        )}
      </section>
    </div>
  );
}

interface ChangeValueProps {
  currency: string;
  language: ProfileLanguage;
  quote: StockQuote;
}

function ChangeValue({ currency, language, quote }: ChangeValueProps) {
  const variant = getChangeVariant(quote.change);

  return (
    <span className={`stock-change stock-change-${variant}`}>
      {formatCurrency(quote.change, currency, language, true)}
      <small>{formatPercent(quote.changePercent, language)}</small>
    </span>
  );
}

interface StockDetailProps {
  label: string;
  value: string;
}

function StockDetail({ label, value }: StockDetailProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

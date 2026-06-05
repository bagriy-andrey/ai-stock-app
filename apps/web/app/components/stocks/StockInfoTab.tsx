"use client";

import type { ProfileLanguage, StockDetails } from "@ai-stock-advisor/shared";
import type { Dictionary } from "../../dictionaries";
import { getChangeVariant, formatPercent } from "../../lib/stock-format";
import {
  formatMarketCap,
  formatOptionalNumber,
  formatOptionalPrice,
  formatOptionalText,
  formatPrice,
} from "./stock-details-utils";

interface StockInfoTabProps {
  details: StockDetails;
  language: ProfileLanguage;
  t: Dictionary;
}

export function StockInfoTab({ details, language, t }: StockInfoTabProps) {
  const fundamentals = details.fundamentals ?? {};

  return (
    <section aria-label={t.stockInfoTab} className="stock-info-tab">
      <div className="stock-modal-price stock-modal-price-compact">
        <span>{t.currentPrice}</span>
        <strong>
          {formatPrice(details.currentPrice, details.currency, language)}
        </strong>
        <ChangeValue details={details} language={language} />
      </div>
      <dl className="stock-stat-grid">
        <StockStatCard
          label={t.currentPrice}
          value={formatPrice(details.currentPrice, details.currency, language)}
        />
        <StockStatCard
          label={t.previousClose}
          value={formatPrice(details.previousClose, details.currency, language)}
        />
        <StockStatCard
          label={t.openPrice}
          value={formatPrice(details.open, details.currency, language)}
        />
        <StockStatCard
          label={t.dayHigh}
          value={formatPrice(details.high, details.currency, language)}
        />
        <StockStatCard
          label={t.dayLow}
          value={formatPrice(details.low, details.currency, language)}
        />
        <StockStatCard
          label={t.fiftyTwoWeekHigh}
          value={formatOptionalPrice(
            fundamentals.fiftyTwoWeekHigh,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockStatCard
          label={t.fiftyTwoWeekLow}
          value={formatOptionalPrice(
            fundamentals.fiftyTwoWeekLow,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockStatCard
          label={t.marketCap}
          value={formatMarketCap(
            fundamentals.marketCap,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockStatCard
          label={t.peRatio}
          value={formatOptionalNumber(fundamentals.peRatio, language)}
        />
        <StockStatCard
          label={t.eps}
          value={formatOptionalPrice(
            fundamentals.eps,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockStatCard
          label={t.currency}
          value={formatOptionalText(fundamentals.currency ?? details.currency)}
        />
        <StockStatCard
          label={t.exchange}
          value={formatOptionalText(fundamentals.exchange ?? details.exchange)}
        />
      </dl>
    </section>
  );
}

interface ChangeValueProps {
  details: StockDetails;
  language: ProfileLanguage;
}

function ChangeValue({ details, language }: ChangeValueProps) {
  const variant = getChangeVariant(details.change);

  return (
    <span className={`stock-change stock-change-${variant}`}>
      {formatPrice(details.change, details.currency, language, true)}
      <small>{formatPercent(details.percentChange, language)}</small>
    </span>
  );
}

interface StockStatCardProps {
  label: string;
  value: string;
}

function StockStatCard({ label, value }: StockStatCardProps) {
  return (
    <div className="stock-stat-card">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

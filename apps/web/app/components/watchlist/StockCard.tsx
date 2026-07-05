"use client";

import type {
  CompanyProfile,
  ProfileLanguage,
  StockQuote,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import clsx from "clsx";
import type { Dictionary } from "../../dictionaries";
import type { StockChartCandle } from "../../lib/market-data-api";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../../lib/stock-format";
import { getWatchlistTargetPriceSummary } from "../../lib/watchlist-target-price";
import { CompanyLogo } from "../stocks/CompanyLogo";

interface StockCardProps {
  item: WatchlistItemDto;
  quote?: StockQuote;
  profile?: CompanyProfile;
  candles?: StockChartCandle[];
  isChartUnavailable: boolean;
  isChartLoading: boolean;
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
  candles,
  isChartUnavailable,
  isChartLoading,
  isPriceLoading,
  isRemoving,
  language,
  t,
  onOpen,
  onRemove,
}: StockCardProps) {
  const companyName =
    profile?.name ?? item.companyName ?? t.companyNameNotSet;
  const targetPriceSummary = getWatchlistTargetPriceSummary({
    currentPrice: quote?.currentPrice,
    currency: profile?.currency || quote?.currency || "USD",
    language,
    targetPrice: item.targetPrice,
  });

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
            {targetPriceSummary.targetLabel ? (
              <p className="stock-card-target">
                <span>{t.targetPrice}: {targetPriceSummary.targetLabel}</span>
                {targetPriceSummary.deltaLabel ? (
                  <strong
                    className={clsx(
                      "stock-change",
                      `stock-change-${targetPriceSummary.variant}`,
                    )}
                  >
                    {targetPriceSummary.deltaLabel}
                  </strong>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        <StockCardPrice
          currency={profile?.currency || quote?.currency || "USD"}
          isLoading={isPriceLoading}
          language={language}
          quote={quote}
          t={t}
        />
        <StockCardSparkline
          candles={candles}
          isUnavailable={isChartUnavailable}
          isLoading={isChartLoading}
          t={t}
        />
        {item.notes ? (
          <p className="stock-card-notes">{item.notes}</p>
        ) : null}
      </button>
      <button
        aria-label={`${isRemoving ? t.removing : t.remove} ${item.ticker}`}
        className="stock-card-remove"
        disabled={isRemoving}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        type="button"
      >
        <TrashIcon />
      </button>
    </article>
  );
}

interface StockCardSparklineProps {
  candles?: StockChartCandle[];
  isUnavailable: boolean;
  isLoading: boolean;
  t: Dictionary;
}

function StockCardSparkline({
  candles,
  isUnavailable,
  isLoading,
  t,
}: StockCardSparklineProps) {
  if (isLoading) {
    return <p className="stock-card-sparkline-status">{t.loadingChart}</p>;
  }

  if (isUnavailable) {
    return <p className="stock-card-sparkline-status">{t.chartUnavailable}</p>;
  }

  const closes =
    candles
      ?.map((candle) => candle.close)
      .filter((close) => Number.isFinite(close)) ?? [];

  if (closes.length < 2) {
    return <p className="stock-card-sparkline-status">{t.noChartData}</p>;
  }

  const firstClose = closes[0];
  const lastClose = closes[closes.length - 1];
  const minimum = Math.min(...closes);
  const maximum = Math.max(...closes);
  const spread = maximum - minimum;
  const width = 280;
  const height = 72;
  const padding = 4;
  const points = closes
    .map((close, index) => {
      const x =
        padding + (index / (closes.length - 1)) * (width - 2 * padding);
      const y =
        spread === 0
          ? height / 2
          : padding + ((maximum - close) / spread) * (height - 2 * padding);

      return `${x},${y}`;
    })
    .join(" ");
  const variant = getChangeVariant(lastClose - firstClose);

  return (
    <div className="stock-card-sparkline" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`}>
        <polyline
          className={`stock-chart-line-${variant}`}
          fill="none"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
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

export function TrashIcon() {
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

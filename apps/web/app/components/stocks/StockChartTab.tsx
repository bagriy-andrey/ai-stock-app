"use client";

import type { ProfileLanguage, StockCandleRange } from "@ai-stock-advisor/shared";
import type { Dictionary } from "../../dictionaries";
import type { StockChartCandle } from "../../lib/market-data-api";
import { getChangeVariant } from "../../lib/stock-format";
import {
  formatCandleDate,
  formatPrice,
} from "./stock-details-utils";

export const candleRanges: StockCandleRange[] = [
  "1d",
  "1w",
  "1m",
  "3m",
  "6m",
  "1y",
  "5y",
  "all",
];

interface StockChartTabProps {
  candles: StockChartCandle[];
  currency?: string;
  isError: boolean;
  isLoading: boolean;
  language: ProfileLanguage;
  range: StockCandleRange;
  t: Dictionary;
  onRangeChange: (range: StockCandleRange) => void;
}

export function StockChartTab({
  candles,
  currency,
  isError,
  isLoading,
  language,
  range,
  t,
  onRangeChange,
}: StockChartTabProps) {
  return (
    <section aria-label={t.chartTab} className="stock-chart-tab">
      <div
        aria-label={t.chartRange}
        className="stock-chart-ranges"
        role="group"
      >
        {candleRanges.map((option) => (
          <button
            aria-pressed={range === option}
            key={option}
            onClick={() => onRangeChange(option)}
            type="button"
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="stock-chart-panel">
        {isLoading ? (
          <p className="stock-chart-status" role="status">
            {t.loadingChart}
          </p>
        ) : isError ? (
          <p className="stock-chart-status error-text" role="alert">
            {t.chartUnavailable}
          </p>
        ) : candles.length === 0 ? (
          <p className="stock-chart-status">{t.noChartData}</p>
        ) : (
          <StockHistoryChart
            candles={candles}
            currency={currency}
            language={language}
            range={range}
            title={t.priceHistory}
          />
        )}
      </div>
    </section>
  );
}

interface StockHistoryChartProps {
  candles: StockChartCandle[];
  currency?: string;
  language: ProfileLanguage;
  range: StockCandleRange;
  title: string;
}

function StockHistoryChart({
  candles,
  currency,
  language,
  range,
  title,
}: StockHistoryChartProps) {
  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  const closes = candles.map((candle) => candle.close);
  const minimum = Math.min(...closes);
  const maximum = Math.max(...closes);
  const spread = maximum - minimum;
  const width = 640;
  const height = 240;
  const padding = 10;
  const points = candles
    .map((candle, index) => {
      const x =
        candles.length === 1
          ? width / 2
          : padding + (index / (candles.length - 1)) * (width - 2 * padding);
      const y =
        spread === 0
          ? height / 2
          : padding +
            ((maximum - candle.close) / spread) * (height - 2 * padding);

      return `${x},${y}`;
    })
    .join(" ");
  const variant = getChangeVariant(lastCandle.close - firstCandle.close);

  return (
    <div className="stock-chart">
      <div className="stock-chart-prices">
        <strong>{formatPrice(firstCandle.close, currency, language)}</strong>
        <strong className={`stock-chart-value-${variant}`}>
          {formatPrice(lastCandle.close, currency, language)}
        </strong>
      </div>
      <svg aria-label={title} role="img" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          className={`stock-chart-line-${variant}`}
          fill="none"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="stock-chart-dates">
        <span>{formatCandleDate(firstCandle.timestamp, language, range)}</span>
        <span>{formatCandleDate(lastCandle.timestamp, language, range)}</span>
      </div>
    </div>
  );
}

"use client";

import type {
  PortfolioPerformancePointDto,
  PortfolioPerformanceRange,
  ProfileLanguage,
} from "@ai-stock-advisor/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ResponsiveLineChart } from "../charts/ResponsiveLineChart";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { Card } from "../ui/card";
import type { Dictionary } from "../../dictionaries";
import { fetchPortfolioPerformance } from "../../lib/portfolio-api";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../../lib/stock-format";

const performanceRanges: PortfolioPerformanceRange[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "ALL",
];

interface PortfolioPerformanceCardProps {
  accessToken: string;
  currency: string;
  language: ProfileLanguage;
  t: Dictionary;
}

export function PortfolioPerformanceCard({
  accessToken,
  currency,
  language,
  t,
}: PortfolioPerformanceCardProps) {
  const [range, setRange] = useState<PortfolioPerformanceRange>("1M");
  const performanceQuery = useQuery({
    queryKey: ["portfolio", "performance", range],
    queryFn: () => fetchPortfolioPerformance(accessToken, range),
    enabled: Boolean(accessToken),
    retry: false,
  });
  const summary = useMemo(
    () => calculatePerformanceSummary(performanceQuery.data ?? []),
    [performanceQuery.data],
  );

  return (
    <Card className="portfolio-performance-card">
      <div className="portfolio-performance-header">
        <div>
          <h2>{t.portfolioPerformance}</h2>
          <p>{t.portfolioPerformanceSubtitle}</p>
        </div>
        <div
          aria-label={t.portfolioPerformanceRange}
          className="portfolio-performance-ranges"
          role="group"
        >
          {performanceRanges.map((option) => (
            <button
              aria-pressed={range === option}
              key={option}
              onClick={() => setRange(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {performanceQuery.isLoading ? (
        <PortfolioPerformanceSkeleton />
      ) : performanceQuery.error instanceof Error ? (
        <ErrorState
          message={t.portfolioPerformanceLoadError}
          title={t.portfolioPerformanceUnavailable}
        />
      ) : !performanceQuery.data || performanceQuery.data.length === 0 ? (
        <EmptyState
          description={t.portfolioPerformanceEmptyDescription}
          title={t.portfolioPerformanceEmpty}
        />
      ) : (
        <>
          <ResponsiveLineChart
            ariaLabel={t.portfolioPerformance}
            currency={currency}
            language={language}
            points={performanceQuery.data.map((point) => ({
              date: point.date,
              value: point.totalValue,
            }))}
          />
          <div className="portfolio-performance-summary">
            <PerformanceMetric
              label={t.currentValue}
              value={formatCurrency(summary.currentValue, currency, language)}
            />
            <PerformanceMetric
              label={t.periodChangePercent}
              value={
                summary.changePercent === null
                  ? t.notAvailable
                  : formatPercent(summary.changePercent, language)
              }
              variant={getChangeVariant(summary.changeValue)}
            />
            <PerformanceMetric
              label={t.periodChangeAmount}
              value={formatCurrency(summary.changeValue, currency, language, true)}
              variant={getChangeVariant(summary.changeValue)}
            />
          </div>
        </>
      )}
    </Card>
  );
}

function PortfolioPerformanceSkeleton() {
  return (
    <div aria-label="Loading portfolio performance" className="portfolio-performance-skeleton" role="status">
      <div className="portfolio-performance-skeleton-chart" />
      <div className="portfolio-performance-skeleton-summary">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function PerformanceMetric({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="portfolio-performance-metric">
      <span>{label}</span>
      <strong className={variant ? `portfolio-performance-value-${variant}` : undefined}>
        {value}
      </strong>
    </div>
  );
}

function calculatePerformanceSummary(points: PortfolioPerformancePointDto[]): {
  changePercent: number | null;
  periodStartValue: number | null;
  changeValue: number;
  currentValue: number;
} {
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) {
    return {
      changePercent: null,
      changeValue: 0,
      currentValue: 0,
      periodStartValue: null,
    };
  }

  const changeValue = lastPoint.totalValue - firstPoint.totalValue;
  const periodStartValue = firstPoint.totalValue;

  return {
    changePercent:
      periodStartValue <= 0 ? null : (changeValue / periodStartValue) * 100,
    changeValue,
    currentValue: lastPoint.totalValue,
    periodStartValue,
  };
}

"use client";

import type {
  PortfolioPerformancePointDto,
  PortfolioPerformanceRange,
  ProfileLanguage,
} from "@ai-stock-advisor/shared";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ResponsiveLineChart,
  type LineChartSeries,
  type LineChartTooltipItem,
  type LineChartTooltipPoint,
} from "../charts/ResponsiveLineChart";
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
  isPortfolioEmpty: boolean;
  language: ProfileLanguage;
  t: Dictionary;
}

export function PortfolioPerformanceCard({
  accessToken,
  currency,
  isPortfolioEmpty,
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
  const chartSeries = useMemo(
    () => buildChartSeries(performanceQuery.data ?? [], t),
    [performanceQuery.data, t],
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
          description={
            isPortfolioEmpty
              ? t.portfolioPerformanceEmptyPortfolioDescription
              : t.portfolioPerformanceEmptyDescription
          }
          icon={<BarChart3 size={26} strokeWidth={2.1} />}
          title={t.portfolioPerformanceEmpty}
        />
      ) : (
        <>
          <ResponsiveLineChart
            ariaLabel={t.portfolioPerformance}
            currency={currency}
            language={language}
            series={chartSeries}
            tooltipItems={(point) =>
              buildTooltipItems(point, currency, language, t)
            }
            xAxisLabelMode={getXAxisLabelMode(range)}
          />
          <div className="portfolio-performance-summary">
            <PerformanceMetric
              label={t.depositedCapital}
              value={formatCurrency(summary.depositedCapital, currency, language)}
            />
            <PerformanceMetric
              label={t.currentValue}
              value={formatCurrency(summary.currentValue, currency, language)}
            />
            <PerformanceMetric
              label={t.investmentGain}
              value={
                formatCurrency(summary.investmentGain, currency, language, true)
              }
              variant={getChangeVariant(summary.investmentGain)}
            />
            <PerformanceMetric
              label={t.totalReturn}
              value={formatPercent(summary.totalReturnPercent, language)}
              variant={getChangeVariant(summary.totalReturnPercent)}
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
  currentValue: number;
  depositedCapital: number;
  investmentGain: number;
  totalReturnPercent: number;
} {
  const lastPoint = points[points.length - 1];

  if (!lastPoint) {
    return {
      currentValue: 0,
      depositedCapital: 0,
      investmentGain: 0,
      totalReturnPercent: 0,
    };
  }

  const currentValue = lastPoint.portfolioValue ?? lastPoint.totalValue;
  const depositedCapital = lastPoint.depositedCapital;
  const investmentGain = lastPoint.totalProfit ?? currentValue - depositedCapital;

  return {
    currentValue,
    depositedCapital,
    investmentGain,
    totalReturnPercent:
      lastPoint.totalReturnPercent ??
      (depositedCapital <= 0 ? 0 : (investmentGain / depositedCapital) * 100),
  };
}

function getXAxisLabelMode(
  range: PortfolioPerformanceRange,
): "monthDay" | "monthYear" {
  return range === "1Y" || range === "5Y" || range === "ALL"
    ? "monthYear"
    : "monthDay";
}

function buildChartSeries(
  points: PortfolioPerformancePointDto[],
  t: Dictionary,
): LineChartSeries[] {
  return [
    {
      id: "portfolioValue",
      label: t.portfolioValue,
      points: points.map((point) => ({
        date: point.date,
        value: point.portfolioValue ?? point.totalValue,
      })),
      variant: "primary",
    },
    {
      id: "depositedCapital",
      label: t.depositedCapital,
      points: points.map((point) => ({
        date: point.date,
        value: point.depositedCapital,
      })),
      variant: "secondary",
    },
  ];
}

function buildTooltipItems(
  point: LineChartTooltipPoint,
  currency: string,
  language: ProfileLanguage,
  t: Dictionary,
): LineChartTooltipItem[] {
  const portfolioValue = point.values.portfolioValue ?? 0;
  const depositedCapital = point.values.depositedCapital ?? 0;
  const investmentGain = portfolioValue - depositedCapital;

  return [
    {
      label: t.portfolioValue,
      value: formatCurrency(portfolioValue, currency, language),
    },
    {
      label: t.depositedCapital,
      value: formatCurrency(depositedCapital, currency, language),
    },
    {
      label: t.investmentGainShort,
      value: formatCurrency(investmentGain, currency, language, true),
      variant: getChangeVariant(investmentGain),
    },
  ];
}

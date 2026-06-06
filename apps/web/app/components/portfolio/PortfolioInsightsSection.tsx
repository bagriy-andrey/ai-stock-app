"use client";

import type {
  PortfolioDto,
  PortfolioPositionDto,
  ProfileLanguage,
} from "@ai-stock-advisor/shared";
import { useQuery } from "@tanstack/react-query";
import { type KeyboardEvent, useMemo } from "react";
import type { Dictionary } from "../../dictionaries";
import { fetchPortfolioPerformance } from "../../lib/portfolio-api";
import {
  getBestPerformer,
  getLargestPosition,
  getTodaysProfitLoss,
  getWorstPerformer,
} from "../../lib/portfolio-insights";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
  type ChangeVariant,
} from "../../lib/stock-format";
import { CompanyLogoAvatar } from "../stocks/CompanyLogo";
import { Card } from "../ui/card";

interface PortfolioInsightsSectionProps {
  accessToken: string;
  currency: string;
  isPortfolioLoading: boolean;
  language: ProfileLanguage;
  onOpenStock: (ticker: string) => void;
  portfolio?: PortfolioDto;
  portfolioError: Error | null;
  t: Dictionary;
}

interface InsightValue {
  text: string;
  tooltip?: string;
  variant?: ChangeVariant;
}

interface InsightCardConfig {
  id: string;
  identity?: PortfolioPositionDto;
  primary: InsightValue;
  secondary?: InsightValue;
  currentValue?: InsightValue;
  title: string;
}

export function PortfolioInsightsSection({
  accessToken,
  currency,
  isPortfolioLoading,
  language,
  onOpenStock,
  portfolio,
  portfolioError,
  t,
}: PortfolioInsightsSectionProps) {
  const positions = useMemo(() => portfolio?.items ?? [], [portfolio?.items]);
  const hasPositions = positions.length > 0;
  const dailyPerformanceQuery = useQuery({
    queryKey: ["portfolio", "performance", "1D"],
    queryFn: () => fetchPortfolioPerformance(accessToken, "1D"),
    enabled: Boolean(accessToken) && hasPositions && !portfolioError,
    retry: false,
  });
  const dailyProfitLoss = useMemo(
    () => getTodaysProfitLoss(dailyPerformanceQuery.data ?? []),
    [dailyPerformanceQuery.data],
  );
  const insightCards = useMemo<InsightCardConfig[]>(() => {
    const bestPerformer = getBestPerformer(positions);
    const worstPerformer = getWorstPerformer(positions);
    const largestPosition = getLargestPosition(
      positions,
      portfolio?.summary.totalCurrentValue ?? 0,
    );
    const cards: InsightCardConfig[] = [];

    cards.push(
      bestPerformer
        ? {
            id: "best-performer",
            identity: bestPerformer,
            primary: {
              text: formatPercent(bestPerformer.profitLossPercent, language),
              variant: getChangeVariant(bestPerformer.profitLossPercent),
            },
            secondary: {
              text: formatCurrency(
                bestPerformer.profitLoss,
                bestPerformer.currency,
                language,
                true,
              ),
              variant: getChangeVariant(bestPerformer.profitLoss),
            },
            currentValue: {
              text: formatCurrency(
                bestPerformer.currentValue,
                bestPerformer.currency,
                language,
              ),
            },
            title: t.bestPerformer,
          }
        : {
            id: "best-performer",
            primary: {
              text: t.noWinningPositions,
            },
            title: t.bestPerformer,
          },
    );

    cards.push(
      worstPerformer
        ? {
            id: "worst-performer",
            identity: worstPerformer,
            primary: {
              text: formatPercent(worstPerformer.profitLossPercent, language),
              variant: getChangeVariant(worstPerformer.profitLossPercent),
            },
            secondary: {
              text: formatCurrency(
                worstPerformer.profitLoss,
                worstPerformer.currency,
                language,
                true,
              ),
              variant: getChangeVariant(worstPerformer.profitLoss),
            },
            currentValue: {
              text: formatCurrency(
                worstPerformer.currentValue,
                worstPerformer.currency,
                language,
              ),
            },
            title: t.worstPerformer,
          }
        : {
            id: "worst-performer",
            primary: {
              text: t.noLosingPositions,
            },
            title: t.worstPerformer,
          },
    );

    cards.push(
      largestPosition
        ? {
            id: "largest-position",
            identity: largestPosition.position,
            primary: {
              text: formatPercent(largestPosition.allocationPercent, language),
            },
            currentValue: {
              text: formatCurrency(
                largestPosition.position.currentValue,
                largestPosition.position.currency,
                language,
              ),
            },
            title: t.largestPosition,
          }
        : {
            id: "largest-position",
            primary: {
              text: t.noPositionsAvailable,
            },
            title: t.largestPosition,
          },
    );

    cards.push({
      id: "daily-profit-loss",
      primary: dailyProfitLoss
        ? {
            text: formatCurrency(
              dailyProfitLoss.profitLoss,
              currency,
              language,
              true,
            ),
            variant: getChangeVariant(dailyProfitLoss.profitLoss),
          }
        : {
            text: t.notAvailable,
            tooltip: t.dailyProfitLossUnavailableTooltip,
          },
      secondary: dailyProfitLoss
        ? {
            text: formatPercent(dailyProfitLoss.profitLossPercent, language),
            variant: getChangeVariant(dailyProfitLoss.profitLoss),
          }
        : undefined,
      title: t.todaysProfitLoss,
    });

    return cards;
  }, [
    currency,
    dailyProfitLoss,
    language,
    portfolio?.summary.totalCurrentValue,
    positions,
    t,
  ]);
  const isLoading =
    isPortfolioLoading || (hasPositions && dailyPerformanceQuery.isLoading);

  return (
    <section aria-labelledby="portfolio-insights-heading" className="page-section">
      <div className="section-heading portfolio-insights-heading">
        <div>
          <h2 id="portfolio-insights-heading">{t.portfolioInsights}</h2>
          <p>{t.portfolioInsightsSubtitle}</p>
        </div>
      </div>

      {isLoading ? (
        <PortfolioInsightsSkeleton />
      ) : portfolioError ? (
        <p className="error-text" role="alert">
          {t.portfolioLoadError}
        </p>
      ) : !hasPositions ? (
        <Card className="portfolio-insights-empty">
          <p>{t.noPortfolioInsightsAvailable}</p>
        </Card>
      ) : (
        <div className="portfolio-insights-grid">
          {insightCards.map((card) => (
            <PortfolioInsightCard
              card={card}
              key={card.id}
              onOpenStock={onOpenStock}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PortfolioInsightCard({
  card,
  onOpenStock,
  t,
}: {
  card: InsightCardConfig;
  onOpenStock: (ticker: string) => void;
  t: Dictionary;
}) {
  const ticker = card.identity?.ticker;
  const isClickable = Boolean(ticker);
  const handleOpenStock = () => {
    if (ticker) {
      onOpenStock(ticker);
    }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenStock();
    }
  };

  return (
    <Card
      aria-label={
        ticker ? `${card.title}: ${ticker}. ${t.stockDetails}` : undefined
      }
      className={[
        "portfolio-insight-card",
        isClickable ? "portfolio-insight-card-clickable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={isClickable ? handleOpenStock : undefined}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <span className="portfolio-insight-title">{card.title}</span>
      {card.identity ? (
        <PortfolioInsightIdentity position={card.identity} />
      ) : null}
      <div className="portfolio-insight-values">
        <InsightValueText value={card.primary} />
        {card.secondary ? (
          <InsightValueText isSecondary value={card.secondary} />
        ) : null}
      </div>
      {card.currentValue ? (
        <div className="portfolio-insight-current-value">
          <small>{t.currentValue}</small>
          <strong>{card.currentValue.text}</strong>
        </div>
      ) : null}
    </Card>
  );
}

function PortfolioInsightIdentity({
  position,
}: {
  position: PortfolioPositionDto;
}) {
  return (
    <div className="portfolio-insight-identity">
      <CompanyLogoAvatar
        className="company-logo--portfolio-insight"
        companyName={position.companyName}
        logoUrl={getPortfolioCompanyLogoUrl(position.ticker)}
        ticker={position.ticker}
      />
      <div>
        <strong>{position.ticker}</strong>
        <small title={position.companyName}>{position.companyName}</small>
      </div>
    </div>
  );
}

function InsightValueText({
  isSecondary = false,
  value,
}: {
  isSecondary?: boolean;
  value: InsightValue;
}) {
  const classNames = [
    isSecondary
      ? "portfolio-insight-value-secondary"
      : "portfolio-insight-value-primary",
    value.variant ? `portfolio-insight-value-${value.variant}` : "",
    value.tooltip ? "portfolio-insight-tooltip" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      aria-label={value.tooltip ? `${value.text}. ${value.tooltip}` : undefined}
      className={classNames}
      data-tooltip={value.tooltip}
      tabIndex={value.tooltip ? 0 : undefined}
      title={value.tooltip}
    >
      {value.text}
    </span>
  );
}

function PortfolioInsightsSkeleton() {
  return (
    <div
      aria-label="Loading portfolio insights"
      className="portfolio-insights-grid"
      role="status"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="portfolio-insight-card portfolio-insight-card-skeleton"
          key={index}
        >
          <span />
          <div />
          <strong />
          <small />
        </div>
      ))}
    </div>
  );
}

function getPortfolioCompanyLogoUrl(ticker: string): string {
  const normalizedTicker = ticker.trim().toUpperCase();

  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(
    normalizedTicker,
  )}.png`;
}

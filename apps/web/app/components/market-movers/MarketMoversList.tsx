"use client";

import type { MarketMover, ProfileLanguage } from "@ai-stock-advisor/shared";
import type { Dictionary } from "../../dictionaries";
import { formatCurrency, formatPercent } from "../../lib/stock-format";

interface MarketMoversListProps {
  isLoading: boolean;
  language: ProfileLanguage;
  movers: MarketMover[];
  onOpenStock: (ticker: string) => void;
  t: Dictionary;
  title: string;
  variant: "gainers" | "losers";
}

export function MarketMoversList({
  isLoading,
  language,
  movers,
  onOpenStock,
  t,
  title,
  variant,
}: MarketMoversListProps) {
  return (
    <section className={`market-movers-panel market-movers-panel-${variant}`}>
      <h3>{title}</h3>
      {isLoading ? (
        <MarketMoversSkeleton label={t.loadingMarketMovers} />
      ) : movers.length === 0 ? (
        <p className="market-movers-status">{t.marketMoversEmpty}</p>
      ) : (
        <ol className="market-movers-list">
          {movers.map((mover, index) => (
            <li key={mover.symbol}>
              <button
                aria-label={`${mover.symbol}: ${mover.name}`}
                className="market-mover-open"
                onClick={() => onOpenStock(mover.symbol)}
                type="button"
              >
                <span className="market-mover-rank">{index + 1}</span>
                <span className="market-mover-identity">
                  <strong>{mover.symbol}</strong>
                  <span>{mover.name}</span>
                </span>
                <strong className="market-mover-price">
                  {formatCurrency(mover.price, "USD", language)}
                </strong>
                <span className={`market-mover-change market-mover-change-${variant}`}>
                  {formatCurrency(mover.change, "USD", language, true)}
                  <small>{formatPercent(mover.changesPercentage, language)}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MarketMoversSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <div aria-label={label} className="market-movers-skeleton" role="status">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="market-mover-skeleton-row" key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

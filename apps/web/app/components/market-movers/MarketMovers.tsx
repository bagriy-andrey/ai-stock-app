"use client";

import type {
  CompanyProfile,
  MarketMoversResponse,
  ProfileLanguage,
} from "@ai-stock-advisor/shared";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Dictionary } from "../../dictionaries";
import { fetchCompanyProfile } from "../../lib/market-data-api";
import { MarketMoverCard } from "./MarketMoverCard";
import {
  MarketMoversTabs,
  type MarketMoversTabValue,
} from "./MarketMoversTabs";

interface MarketMoversProps {
  accessToken?: string;
  hasError: boolean;
  isLoading: boolean;
  language: ProfileLanguage;
  marketMovers?: MarketMoversResponse;
  onOpenStock: (stock: {
    companyName?: string;
    logoUrl?: string;
    ticker: string;
  }) => void;
  t: Dictionary;
}

const maxMoversPerTab = 10;

export function MarketMovers({
  accessToken,
  hasError,
  isLoading,
  language,
  marketMovers,
  onOpenStock,
  t,
}: MarketMoversProps) {
  const [activeTab, setActiveTab] =
    useState<MarketMoversTabValue>("gainers");
  const activeMovers = useMemo(() => {
    const movers =
      activeTab === "gainers" ? marketMovers?.gainers : marketMovers?.losers;

    return (movers ?? []).slice(0, maxMoversPerTab);
  }, [activeTab, marketMovers?.gainers, marketMovers?.losers]);
  const profileQueries = useQueries({
    queries: activeMovers.map((mover) => {
      const ticker = mover.symbol.trim().toUpperCase();

      return {
        queryKey: ["market-data", "company", ticker],
        queryFn: () => fetchCompanyProfile(accessToken ?? "", ticker),
        enabled: Boolean(accessToken) && ticker.length > 0,
        staleTime: 24 * 60 * 60 * 1_000,
        retry: false,
      };
    }),
  });

  return (
    <div className="market-movers-card-shell">
      <MarketMoversTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        t={t}
      >
        {hasError ? (
          <p className="market-movers-status error-text" role="alert">
            {t.marketMoversUnavailable}
          </p>
        ) : isLoading ? (
          <MarketMoversSkeleton label={t.loadingMarketMovers} />
        ) : activeMovers.length === 0 ? (
          <p className="market-movers-status">{t.marketMoversEmpty}</p>
        ) : (
          <div className="market-mover-cards-grid">
            {activeMovers.map((mover, index) => {
              const profile = profileQueries[index]?.data as
                | CompanyProfile
                | undefined;

              return (
                <MarketMoverCard
                  key={mover.symbol}
                  language={language}
                  mover={mover}
                  onOpen={onOpenStock}
                  profile={profile}
                  variant={activeTab}
                />
              );
            })}
          </div>
        )}
      </MarketMoversTabs>
    </div>
  );
}

function MarketMoversSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <div aria-label={label} className="market-mover-cards-grid" role="status">
      {Array.from({ length: maxMoversPerTab }, (_, index) => (
        <div className="market-mover-card market-mover-card-skeleton" key={index}>
          <span className="market-mover-logo-skeleton" />
          <span className="market-mover-ticker-skeleton" />
          <span className="market-mover-percent-skeleton" />
        </div>
      ))}
    </div>
  );
}

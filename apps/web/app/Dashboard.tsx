"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "./components/auth/AuthProvider";
import { MarketMovers } from "./components/market-movers/MarketMovers";
import { AppHeader } from "./components/layout/AppHeader";
import { useI18n } from "./components/i18n/I18nProvider";
import { PopularStocks } from "./components/popular-stocks/PopularStocks";
import { StockDetailsModal } from "./components/stocks/StockDetailsModal";
import { EmptyState } from "./components/ui/EmptyState";
import { fetchMarketMovers } from "./lib/market-data-api";

interface SelectedStockDetails {
  companyName?: string;
  logoUrl?: string;
  ticker: string;
}

export function Dashboard() {
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [detailsStock, setDetailsStock] = useState<SelectedStockDetails | null>(
    null,
  );
  const marketMoversQuery = useQuery({
    queryKey: ["market", "movers"],
    queryFn: () => fetchMarketMovers(accessToken ?? ""),
    enabled: Boolean(accessToken),
    refetchInterval: 5 * 60 * 1_000,
    staleTime: 5 * 60 * 1_000,
    retry: false,
  });
  const marketMovers = marketMoversQuery.data;

  return (
    <main>
      <AppHeader />

      <header className="page-header">
        <p className="eyebrow">{t.dashboardEyebrow}</p>
        <h1>AI Stock Advisor</h1>
        <p className="subtitle">{t.dashboardSubtitle}</p>
      </header>

      <section aria-labelledby="market-movers-heading" className="page-section">
        <div className="section-heading">
          <div>
            <h2 id="market-movers-heading">{t.marketMovers}</h2>
            <p>{t.marketMoversSubtitle}</p>
          </div>
          {marketMovers ? (
            <small>
              {t.marketMoversUpdated}{" "}
              {new Intl.DateTimeFormat(language, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(marketMovers.updatedAt))}
            </small>
          ) : null}
        </div>
        <MarketMovers
          accessToken={accessToken ?? undefined}
          hasError={marketMoversQuery.error instanceof Error}
          isLoading={marketMoversQuery.isLoading}
          language={language}
          marketMovers={marketMovers}
          onOpenStock={setDetailsStock}
          t={t}
        />
      </section>

      <section aria-labelledby="popular-stocks-heading" className="page-section">
        <div className="section-heading">
          <div>
            <h2 id="popular-stocks-heading">{t.popularStocks}</h2>
            <p>{t.popularStocksSubtitle}</p>
          </div>
        </div>
        <PopularStocks
          accessToken={accessToken ?? undefined}
          onOpenStock={setDetailsStock}
          t={t}
        />
      </section>

      <section aria-labelledby="watchlist-heading" className="page-section">
        <h2 id="watchlist-heading">{t.dashboardWatchlist}</h2>
        <EmptyState
          actionHref="/watchlist"
          actionLabel={t.openWatchlist}
          description={t.dashboardEmpty}
          title={t.dashboardEmptyTitle}
        />
      </section>
      {detailsStock ? (
        <StockDetailsModal
          initialCompanyName={detailsStock.companyName}
          initialLogoUrl={detailsStock.logoUrl}
          onClose={() => setDetailsStock(null)}
          open={Boolean(detailsStock)}
          ticker={detailsStock.ticker}
        />
      ) : null}
    </main>
  );
}

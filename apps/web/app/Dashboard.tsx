"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "./components/auth/AuthProvider";
import { MarketMoversList } from "./components/market-movers/MarketMoversList";
import { AppHeader } from "./components/layout/AppHeader";
import { useI18n } from "./components/i18n/I18nProvider";
import { StockDetailsModal } from "./components/stocks/StockDetailsModal";
import { EmptyState } from "./components/ui/EmptyState";
import { fetchMarketMovers } from "./lib/market-data-api";

export function Dashboard() {
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [detailsTicker, setDetailsTicker] = useState<string | null>(null);
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
        {marketMoversQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.marketMoversUnavailable}</p>
        ) : (
          <div className="market-movers-grid">
            <MarketMoversList
              isLoading={marketMoversQuery.isLoading}
              language={language}
              movers={marketMovers?.gainers ?? []}
              onOpenStock={setDetailsTicker}
              t={t}
              title={t.topGainers}
              variant="gainers"
            />
            <MarketMoversList
              isLoading={marketMoversQuery.isLoading}
              language={language}
              movers={marketMovers?.losers ?? []}
              onOpenStock={setDetailsTicker}
              t={t}
              title={t.topLosers}
              variant="losers"
            />
          </div>
        )}
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
      {detailsTicker ? (
        <StockDetailsModal
          onClose={() => setDetailsTicker(null)}
          open={Boolean(detailsTicker)}
          ticker={detailsTicker}
        />
      ) : null}
    </main>
  );
}

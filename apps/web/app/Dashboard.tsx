"use client";

import type { MockStockQuote } from "@ai-stock-advisor/shared";
import { AppHeader } from "./components/layout/AppHeader";
import { useI18n } from "./components/i18n/I18nProvider";

interface DashboardProps {
  mockQuotes: MockStockQuote[];
}

export function Dashboard({ mockQuotes }: DashboardProps) {
  const { t } = useI18n();

  return (
    <main>
      <AppHeader />

      <header>
        <p className="eyebrow">{t.mvpDashboard}</p>
        <h1>AI Stock Advisor</h1>
        <p className="subtitle">{t.dashboardSubtitle}</p>
      </header>

      <section aria-labelledby="watchlist-heading">
        <h2 id="watchlist-heading">{t.mockWatchlist}</h2>
        <div className="quote-grid">
          {mockQuotes.map((quote) => (
            <article className="quote-card" key={quote.symbol}>
              <div>
                <strong>{quote.symbol}</strong>
                <p>{quote.companyName}</p>
              </div>
              <div className="quote-price">
                <span>${quote.price.toFixed(2)}</span>
                <small className={quote.change >= 0 ? "positive" : "negative"}>
                  {quote.change >= 0 ? "+" : ""}
                  {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        {t.nextMockEndpoint} <code>/api/stocks/mock</code>
      </footer>
    </main>
  );
}
